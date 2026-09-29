const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCircuitBreaker } = require('./circuitParser');

const headers = [
    '#', 'Trading Code<span>&#9650;</span>', 'Company', 'Close Price',
    'Breaker %', 'Tick Size', 'Open Adj. Price', 'Lower Limit', 'Upper Limit',
];
const abbank = ['6', 'ABBANK', 'AB Bank PLC.', '4.30', '10.00%', '0.1', '4.30', '3.90', '4.70'];

function table(rows, columns = headers) {
    return `<table data-cms="markets.circuit-breaker" class="w-full text-[13px]">
        <thead><tr>${columns.map(value => `<th>${value}</th>`).join('')}</tr></thead>
        <tbody>${rows.map(row => `<tr>${row.map(value => `<td>${value}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>`;
}

test('parses the new nine-column DSE table without confusing percentage or tick size with prices', () => {
    const html = `<table class="table"><tbody><tr><td>Unrelated data</td></tr></tbody></table>
        ${table([
            abbank,
            ['1', '<a href="/company/1JANATAMF">1JANATAMF</a>', 'First Janata &amp; Mutual Fund',
                '3.70', '10.00%', '0.1', '3.70', '3.40', '4.00'],
        ])}`;

    assert.deepEqual(parseCircuitBreaker(html), [
        { code: 'ABBANK', lowerLimit: 3.9, upperLimit: 4.7, openAdjPrice: 4.3 },
        { code: '1JANATAMF', lowerLimit: 3.4, upperLimit: 4, openAdjPrice: 3.7 },
    ]);
});

test('finds reordered columns using headings with normalized whitespace and sorting arrows', () => {
    const columns = ['Upper Limit', 'Company', ' Open\n Adj.  Price ', 'Trading&nbsp; Code&#9660;', 'Lower Limit'];
    const html = table([['4.70', 'AB Bank PLC.', '4.30', ' ABBANK ', '3.90']], columns);

    assert.deepEqual(parseCircuitBreaker(html), [
        { code: 'ABBANK', lowerLimit: 3.9, upperLimit: 4.7, openAdjPrice: 4.3 },
    ]);
});

test('preserves zero circuit limits for the hyphens published on unrestricted instruments', () => {
    const row = ['47', 'BANGAS', 'Bangas Ltd.', '118.10', '-', '-', '118.10', '-', '-'];

    assert.deepEqual(parseCircuitBreaker(table([row])), [
        { code: 'BANGAS', lowerLimit: 0, upperLimit: 0, openAdjPrice: 118.1 },
    ]);
});

test('parses prices with multiple thousands separators', () => {
    const row = [...abbank];
    row[6] = '1,234,567.80';
    row[7] = '1,111,111.10';
    row[8] = '1,358,024.50';

    assert.deepEqual(parseCircuitBreaker(table([row])), [
        { code: 'ABBANK', lowerLimit: 1111111.1, upperLimit: 1358024.5, openAdjPrice: 1234567.8 },
    ]);
});

test('rejects missing or empty circuit tables instead of returning success with no instruments', () => {
    for (const html of ['', '<html><body>Service unavailable</body></html>', '<table><tbody></tbody></table>', table([])]) {
        assert.throws(() => parseCircuitBreaker(html));
    }
});

test('rejects missing required headers', () => {
    for (const index of [1, 6, 7, 8]) {
        const columns = [...headers];
        columns[index] = 'Unexpected Column';
        assert.throws(() => parseCircuitBreaker(table([abbank], columns)));
    }
});

test('rejects blank trading codes and rows with the wrong number of cells', () => {
    const blankCode = [...abbank];
    blankCode[1] = ' &nbsp; ';

    for (const row of [blankCode, abbank.slice(0, -1), [...abbank, 'Unexpected cell']]) {
        assert.throws(() => parseCircuitBreaker(table([row])));
    }
});

test('rejects blank, malformed, nonfinite, and negative prices in every stored price column', () => {
    for (const index of [6, 7, 8]) {
        for (const value of ['', '&nbsp;', '12oops', 'NaN', 'Infinity', '-1.00']) {
            const row = [...abbank];
            row[index] = value;
            assert.throws(() => parseCircuitBreaker(table([row])), `column ${index}: ${JSON.stringify(value)}`);
        }
    }
});

test('validates later rows before returning any data for persistence', () => {
    const malformedRow = [...abbank];
    malformedRow[1] = 'BROKEN';
    malformedRow[7] = 'unavailable';

    assert.throws(() => parseCircuitBreaker(table([abbank, malformedRow])));
});
