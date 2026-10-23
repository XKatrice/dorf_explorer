const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/data-store.js'), 'utf8').replace(/export /g, ''), context);
const api = vm.runInContext('({ readGames, readStoredJSON, writeStoredJSON, commitStoredRecords })', context);
function memory(records = {}) {
    const data = new Map(Object.entries(records));
    return { data, getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
}

test('missing data has defaults, while malformed data is preserved and rejected', () => {
    const storage = memory();
    assert.equal(api.readGames(storage).length, 0);
    for (const raw of ['', 'null', '{}', '{bad', '[{"id":"one"}]']) {
        storage.data.set('dorfExplorerGames', raw);
        assert.throws(() => api.readGames(storage), /kept unchanged/);
        assert.equal(storage.data.get('dorfExplorerGames'), raw);
    }
});

test('game records require valid scores, unique IDs and valid optional entry data', () => {
    const valid = { id: 'game', total: 10, scores: { forest_tasks: 10 } };
    const storage = memory();
    api.writeStoredJSON(storage, 'dorfExplorerGames', [valid]);
    assert.equal(api.readGames(storage)[0].total, 10);
    for (const records of [[valid, valid], [{ ...valid, total: Infinity }],
        [{ ...valid, scores: { forest_tasks: -1 } }],
        [{ ...valid, entries: { inputs: {}, tasks: { forest_tasks: [null] } } }]]) {
        assert.throws(() => api.writeStoredJSON(storage, 'dorfExplorerGames', records), /data is invalid/);
        assert.equal(api.readGames(storage)[0].total, 10);
    }
    api.writeStoredJSON(storage, 'dorfExplorerGames', [{ ...valid, campaignId: 'one' }]);
    assert.throws(() => api.readGames(storage, 'two'), /different campaign/);
});

test('all records are validated before a multi-record change starts', () => {
    const storage = memory();
    assert.throws(() => api.commitStoredRecords(storage, [
        { key: 'dorfExplorerGames', value: [] }, { key: 'dorfExplorerCampaignArchives', value: {} }
    ]));
    assert.equal(storage.data.size, 0);
});

test('failed rollback retains the campaign archive instead of deleting the recovery copy', () => {
    const originalGames = [{ id: 'game', total: 10, scores: { forest_tasks: 10 } }];
    const storage = memory({ dorfExplorerGames: JSON.stringify(originalGames) });
    const archive = { format: 'Dorf Explorer Campaign', formatVersion: 1,
        campaign: { games: originalGames, progress: { version: 1, moves: [] } } };
    const write = storage.setItem;
    let failRestore = false;
    storage.setItem = (key, value) => {
        if (key === 'dorfExplorerCampaign') { failRestore = true; throw new Error('Write blocked'); }
        if (key === 'dorfExplorerGames' && failRestore) throw new Error('Restore blocked');
        write(key, value);
    };
    assert.throws(() => api.commitStoredRecords(storage, [
        { key: 'dorfExplorerCampaignArchives', value: [archive] },
        { key: 'dorfExplorerGames', value: [] },
        { key: 'dorfExplorerCampaign', value: { version: 1, moves: [] } }
    ]), /backup has been retained/);
    assert.equal(JSON.parse(storage.getItem('dorfExplorerCampaignArchives'))[0].campaign.games[0].total, 10);
});
