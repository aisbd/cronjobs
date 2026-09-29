const cheerio = require('cheerio');

function text(value) {
    return value.replace(/\s+/g, ' ').trim();
}

function parseCompanyPage(html, code) {
    const $ = cheerio.load(html);
    const heading = $('header h1').first();
    const name = text(heading.text());
    const pageCode = text(heading.prev('div').children('div').first().text());
    if (!name || pageCode !== code) {
        throw new Error(`DSE company page is missing or does not match ${code}`);
    }

    const sectorLabel = $('main dt').filter((_, element) =>
        text($(element).text()).toLowerCase() === 'sector'
    ).first();
    let sector = text(sectorLabel.next('dd').text());
    if (!sector) {
        // Some companies only publish their sector in the header badges.
        const badges = heading.parent().find('a[href^="/market-depth?instrument="]').parent();
        sector = text(badges.children('span').first().text());
    }
    if (!sector || sector === '-' || sector === '—') {
        throw new Error(`Missing sector on DSE company page for ${code}`);
    }

    return { name, sector };
}

function sectorKey(name) {
    const key = name.toLowerCase().replace(/\band\b/g, '').replace(/[^a-z0-9]/g, '');
    // New DSE pages abbreviate some of the legacy sector names.
    const aliases = {
        pharmachem: 'pharmaceuticalschemicals',
        financialin: 'financialinstitutions',
    };
    return aliases[key] || key;
}

function findCompanySector(sectors, name) {
    const exact = sectors.filter(sector => text(sector.name).toLowerCase() === name.toLowerCase());
    const matches = exact.length ? exact : sectors.filter(sector => sectorKey(sector.name) === sectorKey(name));
    if (matches.length !== 1) {
        throw new Error(`Expected one matching database sector for DSE sector: ${name}`);
    }
    return matches[0];
}

module.exports = { parseCompanyPage, findCompanySector };
