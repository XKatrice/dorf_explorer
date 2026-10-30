const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const context = vm.createContext({ crypto: { randomUUID: () => 'next-campaign' } });
for (const file of ['data-store', 'rankings', 'campaign-model', 'campaign-files']) {
    vm.runInContext(fs.readFileSync(path.join(root, `js/${file}.js`), 'utf8')
        .replace(/^import .*;\r?\n/gm, '').replace(/export /g, ''), context);
}
const api = vm.runInContext('({ CAMPAIGN_KEY, CAMPAIGN_NODES, CAMPAIGN_PATHS, pathLength, stepId, movementEarned, campaignProgress, campaignAchievements, spendMovement, changePathLength, readCampaignState, ARCHIVE_KEY, ensureCampaignStarted, buildCampaignFile, startNewCampaign, parseCampaignFile, importCampaignFile, assertCampaignEditable, addManualAchievement, updateManualAchievement })', context);
const rankings = fs.readFileSync(path.join(root, 'game_ranking.csv'), 'utf8').trim().split('\n').slice(1).map(row => {
    const [score, title, points] = row.split(',');
    return { minimumScore: Number(score), title, movementPoints: Number(points) };
});
const empty = () => ({ version: 1, moves: [], lengths: {}, players: '' });
function fill(state, pathId, earned = 500) {
    const route = api.CAMPAIGN_PATHS.find(route => route.id === pathId);
    for (let i = 1; i <= api.pathLength(route, state); i++) state = api.spendMovement(state, api.stepId(route, i), earned);
    return state;
}

test('all seventeen path lengths match the confirmed sheet and hearts are on circle four', () => {
    const expected = {
        'start-box1': 2, 'box1-box2': 5, 'box2-circus': 4, 'box2-warehouse': 4,
        'circus-signalman': 6, 'warehouse-signalman': 6, 'circus-deer': 6, 'warehouse-grain': 6,
        'grain-village': 8, 'village-forest': 10, 'forest-clouds': 10,
        'deer-castle': 8, 'castle-farm': 10, 'farm-clouds': 10,
        'signalman-shepherdess': 8, 'shepherdess-hill': 10, 'hill-clouds': 10
    };
    assert.equal(api.CAMPAIGN_PATHS.length, Object.keys(expected).length);
    for (const route of api.CAMPAIGN_PATHS) assert.equal(route.length, expected[route.id], route.id);
    const hearts = api.CAMPAIGN_PATHS.filter(route => route.heart);
    assert.equal(hearts.length, 3);
    for (const route of hearts) assert.equal(route.heart, 4);
});

test('previous map progress is kept where connected and invalid moves are refunded', () => {
    const old = {
        version: 1,
        moves: ['start-box1:1', 'start-box1:2', 'start-box1:3',
            'box1-box2:1', 'box1-box2:2', 'box1-box2:3', 'box1-box2:4', 'box2-circus:1'],
        lengths: { 'start-box1': 3, 'box1-box2': 4, 'warehouse-grain': 7 }, players: 'Jo'
    };
    const restored = api.readCampaignState({ getItem: () => JSON.stringify(old) });
    assert.equal(restored.mapRevision, 2);
    assert.equal(restored.moves.length, 6);
    assert.equal(restored.pathCorrectionRefund, 2);
    assert.equal(api.campaignProgress(restored, 12).balance, 6);
    assert.equal(restored.lengths['start-box1'], undefined);
    assert.equal(restored.lengths['box1-box2'], undefined);
    assert.equal(restored.lengths['warehouse-grain'], 7);
    const next = api.spendMovement(restored, 'box1-box2:5', 12);
    assert(api.campaignProgress(next, 12).reached.has('box2'));
    const again = api.readCampaignState({ getItem: () => JSON.stringify(next) });
    assert.equal(again.moves.length, 7);
});

test('movement awards match every ranking threshold, including above and below the table', () => {
    for (let index = 0; index < rankings.length; index++) {
        const tier = rankings[index];
        assert.equal(api.movementEarned([{ id: 'one', total: tier.minimumScore }], rankings), tier.movementPoints);
        if (index + 1 < rankings.length) {
            assert.equal(api.movementEarned([{ id: 'one', total: tier.minimumScore - 1 }], rankings), rankings[index + 1].movementPoints);
        }
    }
    assert.equal(api.movementEarned([{ id: 'one', total: 999 }], rankings), 15);
    assert.equal(api.movementEarned([], rankings), 0);
});

test('reloading never awards twice and editing or deleting games changes the point pool', () => {
    const games = [{ id: 'one', total: 300 }, { id: 'two', total: 150 }];
    assert.equal(api.movementEarned(games, rankings), 17);
    assert.equal(api.movementEarned([...games, games[0]], rankings), 17);
    assert.equal(api.movementEarned(games, rankings), 17);
    games[0].total = 400;
    assert.equal(api.movementEarned(games, rankings), 20);
    games.shift();
    assert.equal(api.movementEarned(games, rankings), 5);
});

test('each circle costs one point; boxes unlock for free and both branches can be explored', () => {
    let state = empty();
    assert.throws(() => api.spendMovement(state, 'box2-circus:1', 20), /existing progress/);
    assert.throws(() => api.spendMovement(state, 'start-box1:2', 20), /existing progress/);
    state = fill(state, 'start-box1');
    let progress = api.campaignProgress(state, 20);
    assert(progress.reached.has('box1'));
    assert(!progress.reached.has('box2'));
    assert.equal(progress.spent, 2);
    state = fill(state, 'box1-box2');
    progress = api.campaignProgress(state, 20);
    assert(progress.reached.has('box2'));
    assert.equal(progress.balance, 13);
    assert(progress.availableSteps.has('box2-warehouse:1'));
    assert(progress.availableSteps.has('box2-circus:1'));
    state = api.spendMovement(state, 'box2-warehouse:1', 20);
    state = api.spendMovement(state, 'box2-circus:1', 20);
    assert.equal(api.campaignProgress(state, 20).spent, 9);
    assert.throws(() => api.spendMovement(state, 'box2-circus:1', 20), /existing progress/);
});

test('points cannot be overspent; reduced earnings keep progress and block new purchases', () => {
    let state = api.spendMovement(empty(), 'start-box1:1', 1);
    assert.equal(api.campaignProgress(state, 1).balance, 0);
    assert.throws(() => api.spendMovement(state, 'start-box1:2', 1), /No movement/);
    assert.equal(api.campaignProgress(state, 0).balance, -1);
    assert.throws(() => api.spendMovement(state, 'start-box1:2', 0), /No movement/);
    state = { ...state, moves: state.moves.slice(0, -1) };
    assert.equal(api.campaignProgress(state, 1).balance, 1);
    assert.equal(api.campaignProgress(state, 1).spent, 0);
});

test('circles can be approached from either end of a path around the tree', () => {
    let state = fill(fill(empty(), 'start-box1'), 'box1-box2');
    state = fill(state, 'box2-warehouse');
    state = fill(state, 'warehouse-signalman');
    const route = api.CAMPAIGN_PATHS.find(route => route.id === 'circus-signalman');
    for (let index = route.length; index >= 1; index--) state = api.spendMovement(state, api.stepId(route, index), 500);
    assert(api.campaignProgress(state, 500).reached.has('circus'));
    assert(api.campaignProgress(state, 500).availableSteps.has('box2-circus:4'));
});

test('heart circles unlock once and undo removes only the newest progress', () => {
    let state = fill(fill(fill(fill(empty(), 'start-box1'), 'box1-box2'), 'box2-warehouse'), 'warehouse-grain');
    for (let index = 1; index <= 4; index++) state = api.spendMovement(state, `grain-village:${index}`, 500);
    assert.equal(api.campaignProgress(state, 500).hearts, 1);
    state = { ...state, moves: state.moves.slice(0, -1) };
    assert.equal(api.campaignProgress(state, 500).hearts, 0);
    assert(api.campaignProgress(state, 500).reached.has('grain'));
});

test('path corrections persist and cannot invalidate points already spent', () => {
    let state = api.changePathLength(empty(), 'start-box1', 5);
    state = fill(state, 'start-box1');
    assert.equal(api.campaignProgress(state, 10).spent, 5);
    assert(api.campaignProgress(state, 10).reached.has('box1'));
    assert.throws(() => api.changePathLength(state, 'start-box1', 3), /Undo movement/);
    for (const invalid of [0, -1, 1.5, 31, NaN]) assert.throws(() => api.changePathLength(empty(), 'start-box1', invalid), /whole number/);
    assert.throws(() => api.changePathLength(empty(), 'missing', 3), /Unknown/);
    const restored = api.readCampaignState({ getItem: () => JSON.stringify({ ...state, players: 'Alex & Jo' }) });
    assert.equal(restored.players, 'Alex & Jo');
    assert.equal(api.pathLength(api.CAMPAIGN_PATHS[0], restored), 5);
    assert.equal(api.campaignProgress(restored, 10).spent, 5);
});

test('all printed destinations and all three hearts are reachable; replay retains progress', () => {
    let state = empty();
    // Repeatedly choose a valid frontier, which also handles routes reached from the far end.
    while (api.campaignProgress(state, 500).availableSteps.size) {
        const next = [...api.campaignProgress(state, 500).availableSteps][0];
        state = api.spendMovement(state, next, 500);
    }
    const progress = api.campaignProgress(state, 500);
    assert.equal(progress.unlocked.length, 14);
    assert.equal(progress.hearts, 3);
    assert.equal(progress.spent, api.CAMPAIGN_PATHS.reduce((sum, route) => sum + route.length, 0));
    const restored = api.readCampaignState({ getItem: () => JSON.stringify(state) });
    assert.equal(api.campaignProgress(restored, 500).unlocked.length, 14);
    assert.throws(() => api.readCampaignState({ getItem: () => '{bad json' }));
    assert.throws(() => api.readCampaignState({ getItem: () => JSON.stringify({ version: 1, moves: ['clouds:1'] }) }));
});

test('unlock dates persist, stay stable, and are removed when an unlock is undone', () => {
    const firstDate = '2026-10-23T12:00:00Z';
    const secondDate = '2026-10-24T12:00:00Z';
    let state = api.spendMovement(empty(), 'start-box1:1', 20, firstDate);
    assert.equal(state.unlockDates.box1, undefined);
    state = api.spendMovement(state, 'start-box1:2', 20, firstDate);
    assert.equal(state.unlockDates.box1, firstDate);
    state = api.spendMovement(state, 'box1-box2:1', 20, secondDate);
    assert.equal(state.unlockDates.box1, firstDate);
    state = api.readCampaignState({ getItem: () => JSON.stringify(state) });
    assert.equal(state.unlockDates.box1, firstDate);
    const entries = api.campaignAchievements(state);
    assert.equal(entries.length, 17);
    assert.equal(entries.find(item => item.id === 'box1').unlockedAt, firstDate);
    assert.equal(entries.find(item => item.id === 'box2').unlocked, false);
    state = { ...state, moves: state.moves.slice(0, 1) };
    state = api.readCampaignState({ getItem: () => JSON.stringify(state) });
    assert.equal(state.unlockDates.box1, undefined);
    state = api.spendMovement(state, 'start-box1:2', 20, secondDate);
    assert.equal(state.unlockDates.box1, secondDate);
});

test('legacy unlocks have no invented date and heart unlocks record their own date', () => {
    let state = fill(fill(fill(fill(empty(), 'start-box1'), 'box1-box2'), 'box2-warehouse'), 'warehouse-grain');
    delete state.unlockDates;
    state = api.readCampaignState({ getItem: () => JSON.stringify(state) });
    assert.equal(api.campaignAchievements(state).find(item => item.id === 'warehouse').unlockedAt, null);
    for (let index = 1; index <= 4; index++) state = api.spendMovement(state, `grain-village:${index}`, 500, '2026-10-23T12:00:00Z');
    const heart = api.campaignAchievements(state).find(item => item.id === 'heart:grain-village');
    assert.equal(heart.unlocked, true);
    assert.equal(heart.unlockedAt, '2026-10-23T12:00:00Z');
});

function campaignStorage(state, games) {
    const records = new Map([[api.CAMPAIGN_KEY, JSON.stringify(state)], ['dorfExplorerGames', JSON.stringify(games)]]);
    return {
        records, getItem: key => records.get(key) ?? null,
        setItem: (key, value) => records.set(key, value), removeItem: key => records.delete(key)
    };
}

test('campaign files contain dates, players, full games, unlocks, and accurate statistics', () => {
    let state = fill(empty(), 'start-box1');
    state = { ...state, id: 'current', startedAt: '2026-10-01T12:00:00Z', completedAt: '2026-10-23T12:00:00Z', players: 'Alex, Jo' };
    const games = [
        { id: 'a', savedAt: '2026-10-01T12:00:00Z', total: 150, scores: { forest_tasks: 150 } },
        { id: 'b', savedAt: '2026-10-02T12:00:00Z', total: 300, scores: { forest_tasks: 300 }, entries: { tasks: { forest_tasks: [300] } } }
    ];
    const file = api.buildCampaignFile(state, games, rankings, '2026-10-24T12:00:00Z');
    assert.equal(file.campaign.totalGames, 2);
    assert.equal(file.campaign.totalScore, 450);
    assert.equal(file.campaign.highestScoringGame.id, 'b');
    assert.equal(file.campaign.highestScoringGame.score, 300);
    assert.equal(file.campaign.playerNames, 'Alex, Jo');
    assert.equal(file.campaign.startedAt, state.startedAt);
    assert.equal(file.campaign.completedAt, state.completedAt);
    assert.equal(file.campaign.status, 'Completed');
    assert.equal(file.campaign.games[1].ranking.movementPoints, 12);
    assert.equal(file.campaign.games[1].entries.tasks.forest_tasks[0], 300);
    assert.equal(file.campaign.achievements.find(item => item.id === 'box1').unlockedAt, state.unlockDates.box1);
    const emptyFile = api.buildCampaignFile(empty(), [], rankings);
    assert.equal(emptyFile.campaign.highestScoringGame, null);
    assert.equal(emptyFile.campaign.completedAt, null);
    assert.equal(emptyFile.campaign.totalScore, 0);
});

test('starting a new campaign archives all existing data and clears only the active campaign', () => {
    const state = { ...fill(empty(), 'start-box1'), id: 'current', players: 'Jo', startedAt: '2026-10-01T12:00:00Z' };
    const games = [{ id: 'game', savedAt: state.startedAt, total: 300, scores: { forest_tasks: 300 } }];
    const storage = campaignStorage(state, games);
    const next = api.startNewCampaign(storage, rankings, '2026-10-23T12:00:00Z');
    assert.equal(next.startedAt, '2026-10-23T12:00:00Z');
    assert.equal(next.completedAt, null);
    assert.equal(next.players, '');
    assert.equal(next.moves.length, 0);
    assert.equal(JSON.parse(storage.getItem('dorfExplorerGames')).length, 0);
    const archive = JSON.parse(storage.getItem(api.ARCHIVE_KEY))[0];
    assert.equal(archive.campaign.id, 'current');
    assert.equal(archive.campaign.playerNames, 'Jo');
    assert.equal(archive.campaign.games[0].id, 'game');
    assert.equal(archive.campaign.totalScore, 300);
    assert.equal(api.readCampaignState(storage).startedAt, next.startedAt);
});

test('failed archive/reset writes restore the previous campaign and games', () => {
    const state = { ...empty(), id: 'old', startedAt: '2026-10-01T12:00:00Z' };
    const games = [{ id: 'game', total: 300, scores: {} }];
    const storage = campaignStorage(state, games);
    const write = storage.setItem;
    let failed = false;
    storage.setItem = (key, value) => {
        if (key === api.CAMPAIGN_KEY && !failed) { failed = true; throw new Error('Storage full'); }
        return write(key, value);
    };
    assert.throws(() => api.startNewCampaign(storage, rankings), /storage is full/i);
    assert.equal(storage.getItem(api.CAMPAIGN_KEY), JSON.stringify(state));
    assert.equal(storage.getItem('dorfExplorerGames'), JSON.stringify(games));
    assert.equal(storage.getItem(api.ARCHIVE_KEY), null);
});

test('legacy campaigns use the earliest known game date and preserve completion metadata', () => {
    const storage = campaignStorage(empty(), []);
    const games = [{ savedAt: '2026-10-20T12:00:00Z' }, { savedAt: '2026-10-01T12:00:00Z' }];
    let state = api.ensureCampaignStarted(storage, games);
    assert.equal(state.startedAt, '2026-10-01T12:00:00Z');
    state.completedAt = '2026-10-23T12:00:00Z';
    storage.setItem(api.CAMPAIGN_KEY, JSON.stringify(state));
    assert.equal(api.readCampaignState(storage).completedAt, state.completedAt);
    assert.equal(api.ensureCampaignStarted(storage, games).startedAt, state.startedAt);
});

test('campaign import restores games, dates and unlocks while archiving the current campaign', () => {
    const source = { ...fill(empty(), 'start-box1'), id: 'source', startedAt: '2026-10-01T12:00:00Z',
        completedAt: '2026-10-23T12:00:00Z', players: 'Alex and Jo' };
    const games = [{ id: 'source-game', campaignId: 'source', total: 300, scores: { forest_tasks: 300 } }];
    const file = api.buildCampaignFile(source, games, rankings);
    const current = { ...empty(), id: 'current', startedAt: '2026-10-20T12:00:00Z', players: 'Sam' };
    const storage = campaignStorage(current, []);
    const restored = api.importCampaignFile(storage, JSON.stringify(file), rankings);
    assert.notEqual(restored.id, source.id);
    assert.notEqual(restored.id, current.id);
    assert.equal(restored.players, source.players);
    assert.equal(restored.startedAt, source.startedAt);
    assert.equal(restored.completedAt, source.completedAt);
    assert.equal(restored.unlockDates.box1, source.unlockDates.box1);
    assert.equal(restored.moves.length, 2);
    const restoredGames = JSON.parse(storage.getItem('dorfExplorerGames'));
    assert.equal(restoredGames[0].campaignId, restored.id);
    assert.equal(restoredGames[0].total, 300);
    const archives = JSON.parse(storage.getItem(api.ARCHIVE_KEY));
    assert.equal(archives[0].campaign.id, current.id);
    assert.equal(archives[0].campaign.playerNames, 'Sam');
    assert.throws(() => api.assertCampaignEditable(storage, restored.id), /campaign is complete/);
});

test('invalid campaign files never replace the current campaign', () => {
    const current = { ...empty(), id: 'current', startedAt: '2026-10-20T12:00:00Z' };
    const storage = campaignStorage(current, []);
    const file = api.buildCampaignFile({ ...empty(), id: 'source', players: 'Jo' }, [], rankings);
    const badProgress = JSON.parse(JSON.stringify(file));
    badProgress.campaign.progress.moves = ['unknown:1'];
    for (const text of ['not JSON', '{}', JSON.stringify({ ...file, formatVersion: 999 }), JSON.stringify(badProgress)]) {
        assert.throws(() => api.importCampaignFile(storage, text, rankings), /not a valid Dorf Explorer/);
        assert.equal(storage.getItem(api.CAMPAIGN_KEY), JSON.stringify(current));
        assert.equal(storage.getItem('dorfExplorerGames'), '[]');
        assert.equal(storage.getItem(api.ARCHIVE_KEY), null);
    }
});

test('failed imports roll back writes and retain the existing campaign', () => {
    const current = { ...empty(), id: 'current', startedAt: '2026-10-20T12:00:00Z' };
    const games = [{ id: 'old', total: 150, scores: { forest_tasks: 150 } }];
    const storage = campaignStorage(current, games);
    const file = api.buildCampaignFile({ ...empty(), id: 'source', players: 'Jo' }, [], rankings);
    const write = storage.setItem;
    let failed = false;
    storage.setItem = (key, value) => {
        if (key === api.CAMPAIGN_KEY && !failed) { failed = true; throw new Error('Storage full'); }
        write(key, value);
    };
    assert.throws(() => api.importCampaignFile(storage, JSON.stringify(file), rankings), /storage is full/i);
    assert.equal(storage.getItem(api.CAMPAIGN_KEY), JSON.stringify(current));
    assert.equal(storage.getItem('dorfExplorerGames'), JSON.stringify(games));
    assert.equal(storage.getItem(api.ARCHIVE_KEY), null);
});

test('manual achievements require player confirmation even after their reference score reaches the target', () => {
    let state = api.addManualAchievement(empty(), 'Three matching flags', 'All three flags must share one territory.', 30);
    const id = state.manualAchievements[0].id;
    state = api.updateManualAchievement(state, id, { recordedScore: 36 });
    assert.equal(state.manualAchievements[0].completedAt, null);
    assert.equal(api.campaignProgress(state, 10).spent, 0);
    state = api.updateManualAchievement(state, id, { completed: true }, '2026-10-23T12:00:00Z');
    assert.equal(state.manualAchievements[0].completedAt, '2026-10-23T12:00:00Z');
    state = api.updateManualAchievement(state, id, { completed: true }, '2026-10-24T12:00:00Z');
    assert.equal(state.manualAchievements[0].completedAt, '2026-10-23T12:00:00Z');
    state = api.updateManualAchievement(state, id, { completed: false });
    assert.equal(state.manualAchievements[0].completedAt, null);
    assert.throws(() => api.updateManualAchievement(state, id, { recordedScore: -1 }), /whole-number/);
    assert.throws(() => api.addManualAchievement(state, '', 'Condition'), /Enter a name/);
    assert.throws(() => api.addManualAchievement(state, 'Name', 'Condition', 1.5), /whole-number/);
    assert.throws(() => api.updateManualAchievement({ ...state, completedAt: '2026-10-23T12:00:00Z' }, id, { completed: true }), /Reopen/);
});

test('manual checks and completion dates survive storage, export and import without affecting score totals', () => {
    let state = { ...api.addManualAchievement(empty(), 'Territory condition', 'Check the board.', 30), id: 'source', players: 'Jo' };
    const id = state.manualAchievements[0].id;
    state = api.updateManualAchievement(state, id, { recordedScore: 36, completed: true }, '2026-10-23T12:00:00Z');
    const games = [{ id: 'game', total: 100, scores: { forest_tasks: 100 } }];
    const stored = campaignStorage(state, games);
    state = api.readCampaignState(stored);
    assert.equal(state.manualAchievements[0].recordedScore, 36);
    const file = api.buildCampaignFile(state, games, rankings);
    assert.equal(file.campaign.totalScore, 100);
    assert.equal(file.campaign.achievements.find(item => item.id === id).unlockedAt, '2026-10-23T12:00:00Z');
    const destination = campaignStorage({ ...empty(), id: 'other', startedAt: '2026-10-23T12:00:00Z' }, []);
    const restored = api.importCampaignFile(destination, JSON.stringify(file), rankings);
    assert.equal(restored.manualAchievements[0].completedAt, '2026-10-23T12:00:00Z');
    assert.equal(restored.manualAchievements[0].target, 30);
});
