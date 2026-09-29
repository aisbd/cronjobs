const cheerio = require('cheerio');

function parseCircuitBreaker(html) {
    const $ = cheerio.load(html);
    const table = $('table[data-cms="markets.circuit-breaker"]');
    if (table.length !== 1) {
        throw new Error('Expected one DSE circuit breaker table');
    }

    const headers = table.find('thead th').toArray().map(cell =>
        $(cell).text().replace(/[▲▼]/g, '').replace(/\s+/g, ' ').trim().toLowerCase()
    );
    const columns = {};
    for (const header of ['trading code', 'open adj. price', 'lower limit', 'upper limit']) {
        columns[header] = headers.indexOf(header);
        if (columns[header] === -1) {
            throw new Error(`Missing DSE circuit breaker column: ${header}`);
        }
    }

    const rows = table.find('tbody tr').toArray();
    if (rows.length === 0) {
        throw new Error('DSE circuit breaker table contains no rows');
    }

    // Validate every row before any database updates are made.
    return rows.map((row, index) => {
        const cells = $(row).children('td');
        if (cells.length !== headers.length) {
            throw new Error(`Invalid DSE circuit breaker row ${index + 1}: unexpected column count`);
        }

        const code = $(cells[columns['trading code']]).text().trim();
        if (!code) {
            throw new Error(`Missing trading code in DSE circuit breaker row ${index + 1}`);
        }

        function price(header) {
            const value = $(cells[columns[header]]).text().trim();
            // DSE uses '-' when an instrument has no circuit limits.
            if (value === '-' && header !== 'open adj. price') {
                return 0;
            }
            const number = Number(value.replace(/,/g, ''));
            if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(value) || !Number.isFinite(number)) {
                throw new Error(`Invalid ${header} for ${code}: ${value}`);
            }
            return number;
        }

        return {
            code,
            lowerLimit: price('lower limit'),
            upperLimit: price('upper limit'),
            openAdjPrice: price('open adj. price'),
        };
    });
}

async function main() {
    const axios = require('axios');
    const proxy = require('../proxy');
    const { insertFundamentalMeta } = require('./helpers');
    const response = await axios.get('https://www.dse.com.bd/circuit-breaker', { ...proxy, timeout: 20000 });
    const rows = parseCircuitBreaker(response.data);

    for (const row of rows) {
        const meta = { code: row.code, meta_date: '2021-04-21' };
        await insertFundamentalMeta({ ...meta, meta_key: 'circuit_down', meta_value: row.lowerLimit });
        await insertFundamentalMeta({ ...meta, meta_key: 'circuit_up', meta_value: row.upperLimit });
        await insertFundamentalMeta({ ...meta, meta_key: 'open_adj_price', meta_value: row.openAdjPrice });
    }

    // The new page has no reference floor price; leave existing floor data intact.
    return rows.length;
}

module.exports = { parseCircuitBreaker };

if (require.main === module) {
    const sequelize = require('../Sequelize');
    main()
        .then(async function (count) {
            console.log(`Circuit breaker parsed successfully: ${count} instruments`);
            await sequelize.close();
            process.exit(0);
        })
        .catch(async function (err) {
            console.error('Circuit breaker parse failed:', err);
            await sequelize.close();
            process.exit(1);
        });
}
