const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCompanyPage, findCompanySector } = require('./companyParser');

function companyPage({
    code = 'BDTHAIFOOD',
    name = 'BD Thai Food &amp; Beverage Limited',
    sector = 'FoodAllied',
    badge = 'FoodAllied',
    about = true,
} = {}) {
    return `<!doctype html><html><body>
        <header>
            <div>
                <a href="/">Back to market</a>
                <div><div>${code}</div><span>B</span><button>Add to watchlist</button></div>
                <h1>${name}</h1>
                <div>
                    <span>Scrip code · <span>14297</span></span>
                    <span>Instrument · <span>Equity</span></span>
                </div>
                ${badge === null ? '' : `<div>
                    <span>${badge}</span>
                    <span>DSE PUBLIC</span>
                    <span>HQ · Dhaka</span>
                    <a href="/market-depth?instrument=${code}">Market depth</a>
                </div>`}
            </div>
        </header>
        <main>
            <section><h2>Market information</h2><dl><dt>Category</dt><dd>B</dd></dl></section>
            ${about ? `<section><h2>About company</h2><dl>
                <div><dt>Listing year</dt><dd>2022</dd></div>
                <div><dt> Sector </dt><dd>${sector}</dd></div>
            </dl></section>` : ''}
        </main>
    </body></html>`;
}

test('reads the company heading outside main and the labeled sector in its profile', () => {
    assert.deepEqual(parseCompanyPage(companyPage(), 'BDTHAIFOOD'), {
        name: 'BD Thai Food & Beverage Limited',
        sector: 'FoodAllied',
    });
});

test('prefers the labeled sector over the header badge', () => {
    const html = companyPage({ sector: 'PharmaChem', badge: 'Unrelated badge' });

    assert.deepEqual(parseCompanyPage(html, 'BDTHAIFOOD'), {
        name: 'BD Thai Food & Beverage Limited',
        sector: 'PharmaChem',
    });
});

test('uses the header sector badge when the company has no about section', () => {
    const html = companyPage({ code: 'ABBANK', name: 'AB Bank PLC.', about: false, badge: 'Bank' });

    assert.deepEqual(parseCompanyPage(html, 'ABBANK'), {
        name: 'AB Bank PLC.',
        sector: 'Bank',
    });
});

test('decodes entities and preserves apostrophes while normalizing whitespace', () => {
    const html = companyPage({
        name: '  People&#39;s &amp; Sons&nbsp;\n Limited ',
        sector: '  Food&nbsp; &amp;\n Allied  ',
    });

    assert.deepEqual(parseCompanyPage(html, 'BDTHAIFOOD'), {
        name: "People's & Sons Limited",
        sector: 'Food & Allied',
    });
});

test('rejects empty pages and company-not-found error pages even when served successfully', () => {
    for (const html of [
        '',
        '<html><body>Service unavailable</body></html>',
        '<html><body><main><h1>404</h1><h2>Company not found</h2><p>We could not find that ticker on the exchange.</p></main></body></html>',
        companyPage({ name: ' &nbsp; ' }),
    ]) {
        assert.throws(() => parseCompanyPage(html, 'BDTHAIFOOD'), /missing or does not match/);
    }
});

test('rejects a missing or different trading code instead of creating the wrong instrument', () => {
    for (const code of ['', 'OTHERCOMPANY', 'BDTHAIFOODOTHER']) {
        assert.throws(() => parseCompanyPage(companyPage({ code }), 'BDTHAIFOOD'), /missing or does not match/);
    }
});

test('rejects missing and placeholder sector values before persistence', () => {
    assert.throws(() => parseCompanyPage(companyPage({ about: false, badge: null }), 'BDTHAIFOOD'), /Missing sector/);
    for (const sector of ['', ' &nbsp; ', '-', '—']) {
        assert.throws(() => parseCompanyPage(companyPage({ sector, badge: '' }), 'BDTHAIFOOD'), /Missing sector/);
        assert.throws(() => parseCompanyPage(companyPage({ about: false, badge: sector }), 'BDTHAIFOOD'), /Missing sector/);
    }
});

test('maps abbreviated DSE sector names to existing database names', () => {
    const sectors = [
        { id: 1, name: 'Food & Allied' },
        { id: 2, name: 'Pharmaceuticals & Chemicals' },
        { id: 3, name: 'Financial Institutions' },
        { id: 4, name: 'Bank' },
    ];

    assert.strictEqual(findCompanySector(sectors, 'FoodAllied'), sectors[0]);
    assert.strictEqual(findCompanySector(sectors, 'PharmaChem'), sectors[1]);
    assert.strictEqual(findCompanySector(sectors, 'Financial In'), sectors[2]);
    assert.strictEqual(findCompanySector(sectors, 'bank'), sectors[3]);
});

test('matches sector punctuation, whitespace, and the word and consistently', () => {
    const sector = { id: 8, name: '  Food and Allied  ' };

    assert.strictEqual(findCompanySector([sector], 'Food & Allied'), sector);
    assert.strictEqual(findCompanySector([sector], 'FoodAllied'), sector);
});

test('prefers an exact name over additional normalized matches', () => {
    const exact = { id: 1, name: 'FoodAllied' };
    const normalized = { id: 2, name: 'Food & Allied' };

    assert.strictEqual(findCompanySector([normalized, exact], 'FoodAllied'), exact);
});

test('rejects unknown or ambiguous sectors rather than selecting an arbitrary ID', () => {
    for (const sectors of [
        [],
        [{ id: 1, name: 'Bank' }],
        [{ id: 1, name: 'Food & Allied' }, { id: 2, name: 'Food and Allied' }],
        [{ id: 1, name: 'FoodAllied' }, { id: 2, name: 'FoodAllied' }],
    ]) {
        assert.throws(() => findCompanySector(sectors, 'FoodAllied'), /Expected one matching database sector/);
    }
});
