const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, 'getLatestFromDse.js'), 'utf8');
const contactUrl = 'https://stocknow.com.bd/api/v1/contact';
const flush = () => new Promise(resolve => setImmediate(resolve));

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
    return { promise, resolve, reject };
}

// No application dependency is loaded: even startup and shutdown run against mocks.
function loadCron({ get, post } = {}) {
    const calls = { get: [], post: [], db: [], connection: [], errors: [], exits: 0, ends: 0 };
    const timers = new Map();
    const cancellations = [];
    let nextTimer = 0;
    let marketHandler;
    const connection = {
        connect() {},
        end() { calls.ends++; },
        query(sql, callback) { calls.connection.push({ sql, callback }); },
    };
    const axios = {
        CancelToken: {
            source() {
                const pending = deferred();
                const token = { promise: pending.promise };
                const cancellation = {
                    token,
                    cancel(message) {
                        token.reason = Object.assign(new Error(message), { code: 'ERR_CANCELED' });
                        pending.resolve(token.reason);
                    },
                };
                cancellations.push(cancellation);
                return cancellation;
            },
        },
        get(url, options) {
            calls.get.push({ url, options });
            return get ? get(url, options) : Promise.resolve({ data: 'company fixture' });
        },
        post(url, payload, options) {
            calls.post.push({ url, payload, options });
            return post ? post(url, payload, options) : Promise.resolve({ data: { success: true } });
        },
    };
    const modules = {
        '../Sequelize': { query: async () => [[]] },
        axios,
        'dom-parser': function DomParser() {},
        '../db': {
            query(sql, params, callback) {
                calls.db.push({ sql, params: typeof params === 'function' ? undefined : params });
                if (typeof params === 'function') params(null, [{ id: 7, name: 'Food & Allied' }]);
                else callback(null, { insertId: 101 });
            },
        },
        './companyParser': {
            parseCompanyPage: () => ({ name: "Thai's Food & Beverage", sector: 'FoodAllied' }),
            findCompanySector: sectors => sectors[0],
        },
        'lodash.keyby': (rows, key) => Object.fromEntries(rows.map(row => [row[key], row])),
        moment: () => ({ diff: () => 0, isSame: () => true }),
        mysql2: { createConnection: () => connection },
        './test': () => ({ then(callback) { marketHandler = callback; } }),
        './updateIndex': () => {},
    };
    const context = vm.createContext({
        require(name) {
            assert.ok(Object.hasOwn(modules, name), `Unexpected dependency: ${name}`);
            return modules[name];
        },
        console: { log() {}, error(...args) { calls.errors.push(args); } },
        process: { exit() { calls.exits++; } },
        setTimeout(callback, milliseconds) {
            const id = ++nextTimer;
            timers.set(id, { callback, milliseconds });
            return id;
        },
        clearTimeout(id) { timers.delete(id); },
    });
    vm.runInContext(source, context, { filename: 'getLatestFromDse.js' });
    return {
        calls,
        timers,
        cancellations,
        create: context.createNewInstrument,
        request: context.requestWithDeadline,
        startMarket: response => marketHandler(response),
        pending: vm.runInContext('pendingInstrumentCreations', context),
        fire(milliseconds) {
            const entry = [...timers].find(([, timer]) => timer.milliseconds === milliseconds);
            assert.ok(entry, `Expected a ${milliseconds} ms timer`);
            timers.delete(entry[0]);
            return entry[1].callback();
        },
    };
}

for (const failure of [
    { message: 'getaddrinfo ENOTFOUND www.dse.com.bd', code: 'ENOTFOUND' },
    { message: 'Request failed with status code 503', response: { status: 503 } },
]) {
    test(`company request failure reports ${failure.code || failure.response.status} and skips creation`, async () => {
        const error = Object.assign(new Error(failure.message), failure);
        const cron = loadCron({ get: async () => { throw error; } });

        assert.equal(await cron.create('BDTHAIFOOD'), false);
        assert.equal(cron.calls.db.length, 0);
        assert.equal(cron.calls.exits, 0);
        assert.equal(cron.calls.post.length, 1);
        const contact = cron.calls.post[0];
        assert.equal(contact.url, contactUrl);
        assert.equal(contact.payload.name, 'System Cron message');
        assert.equal(contact.payload.mobile, 'err');
        assert.equal(contact.payload.device, 'server');
        assert.match(contact.payload.message, /Instrument: BDTHAIFOOD/);
        assert.match(contact.payload.message, /URL: https:\/\/www\.dse\.com\.bd\/company\/BDTHAIFOOD/);
        assert.ok(contact.payload.message.includes(`Error: ${failure.message}`));
        if (failure.code) assert.match(contact.payload.message, /Error code: ENOTFOUND/);
        if (failure.response) assert.match(contact.payload.message, /HTTP status: 503/);
        assert.match(contact.payload.message, /market updates will continue/);
        assert.equal(cron.calls.get[0].options.timeout, 20000);
        assert.equal(contact.options.timeout, 5000);
        assert.equal(cron.timers.size, 1, 'Only the cron shutdown timer remains');
    });
}

test('failed contact submission is logged and does not reject or exit', async () => {
    const cron = loadCron({
        get: async () => { throw new Error('DNS resolution failed'); },
        post: async () => { throw new Error('Contact endpoint unavailable'); },
    });

    assert.equal(await cron.create('BDTHAIFOOD'), false);
    assert.equal(cron.calls.exits, 0);
    assert.equal(cron.calls.db.length, 0);
    assert.equal(cron.calls.errors.length, 2);
    assert.match(cron.calls.errors[1].join(' '), /Failed to notify admin.*Contact endpoint unavailable/);
    assert.equal(cron.timers.size, 1);
});

test('successful creation uses the new encoded URL and parameterized insert without alerting', async () => {
    const cron = loadCron();

    assert.equal(await cron.create('TEST & CO'), true);
    assert.equal(cron.calls.get[0].url, 'https://www.dse.com.bd/company/TEST%20%26%20CO');
    assert.equal(cron.calls.post.length, 0);
    assert.equal(cron.calls.db.length, 2);
    assert.match(cron.calls.db[1].sql, /VALUES \(\?, \?, \?\)/);
    assert.deepEqual(Array.from(cron.calls.db[1].params), ['TEST & CO', "Thai's Food & Beverage", 7]);
    assert.equal(cron.timers.size, 1);
});

test('request deadline supplies a cancel token and clears its timer on success and rejection', async () => {
    const cron = loadCron();
    const response = { data: 'ok' };
    const result = await cron.request(options => {
        assert.equal(options.timeout, 1234);
        assert.equal(options.cancelToken, cron.cancellations[0].token);
        assert.equal(cron.timers.size, 2);
        return Promise.resolve(response);
    }, 1234);
    assert.equal(result, response);
    assert.equal(cron.timers.size, 1);

    const error = new Error('request failed');
    await assert.rejects(cron.request(() => Promise.reject(error), 1234), error);
    assert.equal(cron.timers.size, 1);
});

test('unresolved company and contact requests are both cancelled within their deadlines', async () => {
    const untilCancelled = options => options.cancelToken.promise.then(error => { throw error; });
    const cron = loadCron({
        get: (url, options) => untilCancelled(options),
        post: (url, payload, options) => untilCancelled(options),
    });
    const creation = cron.create('BDTHAIFOOD');

    cron.fire(20000);
    await flush();
    assert.equal(cron.calls.post.length, 1);
    assert.match(cron.calls.post[0].payload.message, /Request timed out after 20000 ms/);
    cron.fire(5000);

    assert.equal(await creation, false);
    assert.equal(cron.calls.db.length, 0);
    assert.equal(cron.calls.exits, 0);
    assert.equal(cron.cancellations.length, 2);
    assert.ok(cron.cancellations.every(cancellation => cancellation.token.reason));
    assert.equal(cron.timers.size, 1);
});

test('market updates proceed during company lookup and shutdown waits for its contact submission', async () => {
    const lookup = deferred();
    const notification = deferred();
    const cron = loadCron({ get: () => lookup.promise, post: () => notification.promise });
    const row = code => ({
        MKISTAT_INSTRUMENT_CODE: code,
        MKISTAT_OPEN_PRICE: '10', MKISTAT_CLOSE_PRICE: '11',
        MKISTAT_PUB_LAST_TRADED_PRICE: '11', MKISTAT_SPOT_LAST_TRADED_PRICE: '0',
        MKISTAT_HIGH_PRICE: '12', MKISTAT_LOW_PRICE: '9', MKISTAT_YDAY_CLOSE_PRICE: '10',
        MKISTAT_TOTAL_TRADES: 10, MKISTAT_TOTAL_VALUE: '1.2', MKISTAT_TOTAL_VOLUME: 100,
        MKISTAT_QUOTE_BASES: 'A', MKISTAT_LM_DATE_TIME: '2026-09-29 12:00:00',
        MKISTAT_SPOT_TOTAL_TRADES: 0,
    });
    cron.startMarket({ data: {
        IDX: [],
        TRD: [{ TRD_TOTAL_TRADES: 10, TRD_TOTAL_VOLUME: 100, TRD_TOTAL_VALUE: 1.2,
            TRD_LM_DATE_TIME: '2026-09-29 12:00:00' }],
        MKISTAT: [row('BDTHAIFOOD'), row('EXISTING')],
    } });
    const select = cron.calls.connection.find(call => /SELECT \* from instruments/.test(call.sql));
    const processing = select.callback(null, [{
        id: 42, code: 'EXISTING', volume: 1, value: 0.1, trades: 1,
        category: 'A', updated_at: '2026-09-29 11:00:00',
    }]);

    assert.equal(await Promise.race([processing.then(() => 'finished'), flush().then(() => 'blocked')]),
        'finished', 'Existing instruments must not wait for missing-company requests');
    assert.ok(cron.calls.connection.some(call => /insert into instruments \(id,/.test(call.sql)
        && call.sql.includes('( 42,')), 'Existing instrument update was dispatched');
    assert.equal(cron.pending.size, 1);

    const shutdown = cron.fire(30000);
    await flush();
    assert.equal(cron.calls.exits, 0);
    lookup.reject(Object.assign(new Error('DNS resolution failed'), { code: 'ENOTFOUND' }));
    await flush();
    assert.equal(cron.calls.post.length, 1);
    assert.equal(cron.pending.size, 1);
    assert.equal(cron.calls.ends, 0);
    assert.equal(cron.calls.exits, 0, 'Shutdown must wait until the contact request settles');

    notification.resolve({ data: { success: true } });
    await shutdown;
    assert.equal(cron.pending.size, 0);
    assert.equal(cron.calls.ends, 1);
    assert.equal(cron.calls.exits, 1);
    assert.equal(cron.timers.size, 0);
});
