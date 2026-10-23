const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'scores.html'), 'utf8');

function setup(games = [], edit = '') {
    const nodes = new Map();
    function element(type = '') {
        return {
            type, value: '', checked: false, textContent: '', dataset: {}, children: [], listeners: {},
            hidden: true, disabled: false,
            addEventListener(event, callback) { this.listeners[event] = callback; },
            appendChild(child) { this.children.push(child); },
            setAttribute() {}, focus() { this.focused = true; }, setCustomValidity() {}, reportValidity() {},
            closest() { return this.inForm ? {} : null; },
            set innerHTML(value) { this.children = []; },
            get validity() {
                const value = Number(this.value);
                return { valid: this.value === '' || (Number.isFinite(value) && value >= 0
                    && (this.max === undefined || value <= this.max) && Number.isInteger(value)) };
            }
        };
    }
    for (const match of html.matchAll(/<[^>]+\bid="([^"]+)"[^>]*>/g)) {
        const tag = match[0];
        const node = element(tag.match(/type="([^"]*)"/)?.[1]);
        node.id = match[1];
        node.value = tag.match(/value="([^"]*)"/)?.[1] || '';
        node.max = tag.includes('max=') ? Number(tag.match(/max="([^"]*)"/)[1]) : undefined;
        node.min = tag.match(/min="([^"]*)"/)?.[1] ?? '';
        node.isInput = tag.startsWith('<input');
        node.isScore = tag.includes('class="score-input"');
        node.inForm = /task-score$/.test(match[1]);
        nodes.set(match[1], node);
    }
    const saveLabel = element();
    const state = { data: JSON.stringify(games), writes: 0, alerts: [], location: '' };
    const otherRecords = new Map();
    const document = {
        getElementById: id => nodes.get(id) || null,
        createElement: () => element(),
        querySelector: selector => { assert.equal(selector, '#save-game span'); return saveLabel; },
        querySelectorAll(selector) {
            const inputs = [...nodes.values()].filter(node => node.isInput);
            if (selector === '.score-input') return inputs.filter(node => node.isScore);
            if (selector === ".score-input:not([type='hidden'])") return inputs.filter(node => node.isScore && node.type !== 'hidden');
            assert.equal(selector, ".score-grid input:not([type='hidden'])");
            return inputs.filter(node => node.type !== 'hidden');
        }
    };
    const context = vm.createContext({
        document, URLSearchParams, console: { log() {} },
        crypto: { randomUUID: () => 'new-game' },
        localStorage: {
            getItem: key => key === 'dorfExplorerGames' ? state.data : otherRecords.get(key) ?? null,
            setItem(key, value) {
                if (key === 'dorfExplorerGames') state.data = value;
                else otherRecords.set(key, value);
                state.writes++;
            },
            removeItem: key => otherRecords.delete(key)
        },
        window: {
            location: { search: edit ? '?edit=' + encodeURIComponent(edit) : '', assign: url => state.location = url },
            alert: text => state.alerts.push(text)
        }
    });
    for (const file of ['data-store', 'rankings', 'campaign-model', 'campaign-files', 'validation', 'scoring', 'storage', 'specials', 'flags']) {
        const code = fs.readFileSync(path.join(root, `js/${file}.js`), 'utf8')
            .replace(/^import .*;\r?\n/gm, '').replace(/export /g, '');
        vm.runInContext(code, context);
    }
    vm.runInContext('const editingGame = loadGameForEditing(); initialiseSpecials(editingGame); initialiseFlags();', context);
    state.writes = 0;
    const run = code => vm.runInContext(code, context);
    const input = (id, value) => { const node = nodes.get(id); node.value = value; node.listeners.input(); };
    const add = (form, id, score) => {
        nodes.get(id).value = score;
        nodes.get(form).listeners.submit({ preventDefault() {} });
    };
    return { nodes, state, run, input, add, saveLabel, otherRecords, storage: context.localStorage };
}

test('new save and edit restore individual entries and update the same record', () => {
    const first = setup();
    first.add('forest-tasks-form', 'forest-task-score', 5);
    first.add('forest-tasks-form', 'forest-task-score', 7);
    first.add('harvest-form', 'harvest-task-score', 4);
    first.input('flag-forest-1', 3);
    first.input('flag-forest-2', 6);
    first.input('heart-1-score', 5);
    first.input('golden-heart-edges', 4);
    first.input('signalman-count', 3);
    first.nodes.get('circus').checked = true;
    first.run('calculateScore(); saveGame();');
    const original = JSON.parse(first.state.data)[0];
    assert.equal(original.total, 58);
    assert.equal(original.scores.circus, 1);
    assert.deepEqual(original.entries.tasks.forest_tasks, [5, 7]);
    const other = { id: 'other', total: 1, scores: { long_rail: 1 }, savedAt: '2020-01-01' };
    const edit = setup([original, other], original.id);
    assert.equal(Number(edit.nodes.get('total_points').textContent), 58);
    assert.equal(edit.nodes.get('forest-task-score-list').children.length, 2);
    assert.equal(edit.nodes.get('golden-heart-edges').value, 4);
    assert.equal(edit.nodes.get('flag-forest-2').value, 6);
    assert.equal(edit.nodes.get('circus').checked, true);
    assert.match(edit.saveLabel.textContent, /Save Changes/);
    assert.equal(edit.state.writes, 0, 'opening/cancelling must not change storage');
    edit.add('forest-tasks-form', 'forest-task-score', 4);
    edit.nodes.get('harvest-score-list').children[0].listeners.click();
    edit.run('saveGame()');
    const updated = JSON.parse(edit.state.data);
    assert.equal(updated.length, 2);
    assert.equal(updated[0].total, 54);
    assert.equal(updated[0].id, original.id);
    assert.equal(updated[0].savedAt, original.savedAt);
    assert.deepEqual(updated[1], { ...other, campaignId: original.campaignId });
    assert.equal(edit.state.location, 'campaign.html');
    const reopened = setup(updated, original.id);
    assert.equal(Number(reopened.nodes.get('total_points').textContent), 54);
    assert.equal(reopened.nodes.get('harvest-score-list').children.length, 0);
});

test('legacy saves preserve all heart totals, section totals, and the Circus bonus', () => {
    for (let hearts = 0; hearts <= 30; hearts++) {
        const scores = { forest_tasks: 12, harvest_points: 16, flag_forest: 23,
            flag_grain: 7, flag_village: 9, heart_points: hearts, long_rail: 4,
            signalman_points: 6, shepherdess_points: 8, circus: 0 };
        const total = Object.values(scores).reduce((sum, score) => sum + score, 0) + 10;
        const legacy = { id: 'old', savedAt: '2025-01-01', scores, total };
        const edit = setup([legacy], 'old');
        assert.equal(Number(edit.nodes.get('total_points').textContent), total, `heart total ${hearts}`);
        assert.equal(Number(edit.nodes.get('harvest-subtotal').textContent), 8);
        assert.equal(Number(edit.nodes.get('flag-forest-1').value), 23);
        edit.run('saveGame()');
        const reopened = setup(JSON.parse(edit.state.data), 'old');
        assert.equal(Number(reopened.nodes.get('total_points').textContent), total);
    }
});

test('missing or deleted games cannot be silently saved as a new record', () => {
    const edit = setup([], 'missing');
    assert.equal(edit.nodes.get('save-game').disabled, true);
    edit.input('flag-forest-1', 5);
    edit.run('saveGame()');
    assert.equal(edit.state.writes, 0);
    assert.match(edit.state.alerts[0], /no longer exists/);
});

test('empty games are still blocked and unsubmitted tasks are not saved', () => {
    const fresh = setup();
    fresh.run('saveGame()');
    assert.equal(fresh.state.writes, 0);
    fresh.input('flag-grain-1', 2);
    fresh.nodes.get('forest-task-score').value = 9;
    fresh.run('saveGame()');
    const game = JSON.parse(fresh.state.data)[0];
    assert.equal(game.total, 2);
    assert.equal(game.entries.inputs['forest-task-score'], undefined);
    assert.deepEqual(game.entries.tasks.forest_tasks, []);
});

test('Campaign offers an edit link and recalculates ranking from the saved total', async () => {
    const csv = fs.readFileSync(path.join(root, 'game_ranking.csv'), 'utf8');
    const tiers = csv.trim().split('\n').slice(1).map(row => row.split(',').map(value => value.trim()));
    const list = { children: [], appendChild(child) { this.children.push(child); } };
    let game = { id: 'game / 1', savedAt: '2025-01-01', scores: { forest_tasks: 1 }, total: 1 };
    const records = new Map();
    const context = vm.createContext({
        document: {
            getElementById: () => list,
            createElement: () => ({ querySelector: () => ({ addEventListener() {} }) })
        },
        fetch: async () => ({ ok: true, text: async () => csv }),
        crypto: { randomUUID: () => 'history-campaign' },
        localStorage: {
            getItem: key => key === 'dorfExplorerGames' ? JSON.stringify([game]) : records.get(key) ?? null,
            setItem: (key, value) => records.set(key, value)
        }
    });
    for (const file of ['data-store', 'rankings', 'campaign-model', 'campaign-files']) {
        vm.runInContext(fs.readFileSync(path.join(root, `js/${file}.js`), 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/export /g, ''), context);
    }
    vm.runInContext(fs.readFileSync(path.join(root, 'js/campaign.js'), 'utf8').replace(/^import .*;\r?\n/gm, '').replace('export ', ''), context);
    await vm.runInContext('initialiseCampaign()', context);
    assert(list.children[0].innerHTML.includes('scores.html?edit=game%20%2F%201'));
    const expected = tiers.find(tier => game.total >= Number(tier[0]));
    assert(list.children[0].innerHTML.includes(expected[1]));
    game.total = Number(tiers[0][0]);
    await vm.runInContext('initialiseCampaign()', context);
    assert(list.children.at(-1).innerHTML.includes(tiers[0][1]));
    game.scores['<img src=x onerror=alert(1)>'] = 0;
    await vm.runInContext('initialiseCampaign()', context);
    assert(!list.children.at(-1).innerHTML.includes('<img src=x'));
    assert(list.children.at(-1).innerHTML.includes('&lt;img src=x'));
});

test('achievement counts every special task at x1 without adding to the game score', () => {
    const game = setup();
    game.add('forest-tasks-form', 'forest-task-score', 100);
    game.add('grain-tasks-form', 'grain-task-score', 5);
    game.add('village-tasks-form', 'village-task-score', 6);
    game.add('rail-tasks-form', 'rail-task-score', 7);
    game.add('river-tasks-form', 'river-task-score', 9);
    const specials = [
        ['harvest-form', 'harvest-task-score', 4],
        ['watchtower-form', 'watchtower-task-score', 5],
        ['forest-cabin-form', 'forest-cabin-task-score', 6],
        ['ship-form', 'ship-task-score', 7],
        ['locomotive-form', 'locomotive-task-score', 8]
    ];
    for (const [form, input, score] of specials) game.add(form, input, score);
    assert.equal(Number(game.nodes.get('achievement-task-total').textContent), 157);
    assert.equal(Number(game.nodes.get('task_points').textContent), 127);
    assert.equal(Number(game.nodes.get('special_points').textContent), 60);
    assert.equal(Number(game.nodes.get('total_points').textContent), 187);
    game.input('flag-forest-1', 10);
    game.input('heart-1-score', 6);
    game.input('signalman-count', 3);
    game.input('shepherdess-count', 4);
    game.nodes.get('circus').checked = true;
    game.nodes.get('long_rail').value = 12;
    game.run('calculateScore(); saveGame();');
    assert.equal(Number(game.nodes.get('achievement-task-total').textContent), 157);
    assert.equal(Number(game.nodes.get('total_points').textContent), 239);
    const saved = JSON.parse(game.state.data);
    assert.equal(saved[0].scores['achievement-task-total'], undefined);
    const edit = setup(saved, saved[0].id);
    assert.equal(Number(edit.nodes.get('achievement-task-total').textContent), 157);
    edit.nodes.get('harvest-score-list').children[0].listeners.click();
    assert.equal(Number(edit.nodes.get('achievement-task-total').textContent), 153);
    assert.equal(Number(edit.nodes.get('total_points').textContent), 231);
    edit.add('harvest-form', 'harvest-task-score', 10);
    assert.equal(Number(edit.nodes.get('achievement-task-total').textContent), 163);
});

test('Hill scores task counts at x2 and survives saving and editing', () => {
    const game = setup();
    for (const count of [0, 1, 7, 20]) {
        game.input('hill-count', count);
        for (const id of ['hill-total', 'summary_hill', 'special_points', 'total_points']) {
            assert.equal(Number(game.nodes.get(id).textContent), count * 2, id);
        }
        assert.equal(Number(game.nodes.get('achievement-task-total').textContent), 0);
    }
    for (const invalid of [-1, 1.5, 'invalid', '']) {
        game.input('hill-count', invalid);
        assert.equal(Number(game.nodes.get('hill-total').textContent), 0);
    }
    game.input('hill-count', 7);
    game.run('saveGame()');
    const saved = JSON.parse(game.state.data);
    assert.equal(saved[0].scores.hill_points, 14);
    const edit = setup(saved, saved[0].id);
    assert.equal(Number(edit.nodes.get('hill-count').value), 7);
    edit.input('hill-count', 8);
    edit.run('saveGame()');
    const updated = JSON.parse(edit.state.data);
    assert.equal(updated.length, 1);
    assert.equal(updated[0].total, 16);
    assert.equal(updated[0].scores.hill_points, 16);
});

test('Balloon Launch Site tracks the full game score at and above 300', () => {
    const game = setup();
    assert.equal(game.nodes.get('achievement-balloon-status').textContent, '300 points to go');
    game.add('forest-tasks-form', 'forest-task-score', 279);
    game.input('hill-count', 10);
    assert.equal(Number(game.nodes.get('achievement-balloon-total').textContent), 299);
    assert.equal(game.nodes.get('achievement-balloon-status').textContent, '1 point to go');
    game.input('flag-forest-1', 1);
    assert.equal(Number(game.nodes.get('total_points').textContent), 300);
    assert.equal(game.nodes.get('achievement-balloon-status').textContent, 'Achievement reached!');
    game.input('flag-forest-1', 7);
    game.run('saveGame()');
    const saved = JSON.parse(game.state.data);
    assert.equal(saved[0].total, 306);
    const edit = setup(saved, saved[0].id);
    assert.equal(Number(edit.nodes.get('achievement-balloon-total').textContent), 306);
    assert.equal(edit.nodes.get('achievement-balloon-status').textContent, 'Achievement reached!');
    edit.input('hill-count', 0);
    assert.equal(Number(edit.nodes.get('achievement-balloon-total').textContent), 286);
    assert.equal(edit.nodes.get('achievement-balloon-status').textContent, '14 points to go');
});

test('Balloon scoring doubles distance once and restores after editing', () => {
    const game = setup();
    for (const distance of [0, 1, 8, 25]) {
        game.input('balloon-distance', distance);
        for (const id of ['balloon-total', 'summary_balloon', 'special_points', 'total_points']) {
            assert.equal(Number(game.nodes.get(id).textContent), distance * 2, id);
        }
        assert.equal(Number(game.nodes.get('achievement-task-total').textContent), 0);
    }
    for (const invalid of [-1, 2.5, 'invalid', '']) {
        game.input('balloon-distance', invalid);
        assert.equal(Number(game.nodes.get('balloon-total').textContent), 0);
    }
    game.input('balloon-distance', 8);
    game.add('forest-tasks-form', 'forest-task-score', 284);
    assert.equal(game.nodes.get('achievement-balloon-status').textContent, 'Achievement reached!');
    game.run('saveGame()');
    const saved = JSON.parse(game.state.data);
    assert.equal(saved[0].scores.balloon_points, 16);
    assert.equal(saved[0].total, 300);
    const edit = setup(saved, saved[0].id);
    assert.equal(Number(edit.nodes.get('balloon-distance').value), 8);
    edit.input('balloon-distance', 9);
    edit.run('saveGame()');
    const updated = JSON.parse(edit.state.data);
    assert.equal(updated.length, 1);
    assert.equal(updated[0].total, 302);
    assert.equal(updated[0].scores.balloon_points, 18);
    const legacy = { ...updated[0] };
    delete legacy.entries;
    assert.equal(Number(setup([legacy], legacy.id).nodes.get('total_points').textContent), 302);
});

test('Golden Heart input rejects values outside whole numbers zero to six', () => {
    const game = setup();
    for (let edges = 0; edges <= 6; edges++) {
        game.input('golden-heart-edges', String(edges));
        assert.equal(Number(game.nodes.get('golden-heart-total').textContent), edges * 2);
    }
    for (const invalid of ['7', '12', '-1', '2.5', 'abc']) {
        game.input('golden-heart-edges', invalid);
        assert.equal(game.nodes.get('golden-heart-edges').value, '6');
        assert.equal(Number(game.nodes.get('golden-heart-total').textContent), 12);
    }
    game.input('golden-heart-edges', '');
    assert.equal(game.nodes.get('golden-heart-edges').value, '');
    assert.equal(Number(game.nodes.get('golden-heart-total').textContent), 0);
});

test('ordinary scores reject negative, fractional, nonfinite and unsafe values before saving', () => {
    for (const id of ['long_rail', 'long_river', 'harbour', 'train_station']) {
        const game = setup();
        game.add('forest-tasks-form', 'forest-task-score', 10);
        for (const invalid of ['-2', '1.5', 'abc', 'Infinity', '1e309', '9007199254740992']) {
            game.nodes.get(id).value = invalid;
            game.run('calculateScore(); saveGame()');
            assert.equal(Number(game.nodes.get('total_points').textContent), 10, id);
            assert.equal(game.state.writes, 0, 'invalid saves must not write storage');
            assert.equal(game.nodes.get(id).focused, true);
            assert.equal(game.nodes.get('score-validation-message').hidden, false);
        }
        game.nodes.get(id).value = '2';
        game.run('saveGame()');
        assert.equal(JSON.parse(game.state.data)[0].total, 12);
        assert.equal(game.nodes.get('score-validation-message').hidden, true);
    }
});

test('invalid individual flags, hearts and counts cannot be saved as zero', () => {
    for (const [id, invalid] of [['flag-forest-1', '-1'], ['heart-1-score', '7'],
        ['hill-count', '2.5'], ['balloon-distance', '4503599627370496']]) {
        const game = setup();
        game.add('forest-tasks-form', 'forest-task-score', 10);
        game.input(id, invalid);
        game.run('saveGame()');
        assert.equal(game.state.writes, 0, id);
        assert.equal(game.nodes.get(id).focused, true);
    }
});

test('invalid task submissions cannot create chips or modify the existing total', () => {
    const game = setup();
    game.add('forest-tasks-form', 'forest-task-score', 10);
    for (const invalid of ['-1', '0', '2.5', 'Infinity', 'abc', '9007199254740992']) {
        game.add('forest-tasks-form', 'forest-task-score', invalid);
        assert.equal(game.nodes.get('forest-task-score-list').children.length, 1);
        assert.equal(Number(game.nodes.get('total_points').textContent), 10);
        assert.equal(game.nodes.get('score-validation-message').hidden, false);
    }
    game.add('forest-tasks-form', 'forest-task-score', 5);
    assert.equal(Number(game.nodes.get('total_points').textContent), 15);
    assert.equal(game.nodes.get('score-validation-message').hidden, true);
});

test('number inputs with browser badInput are rejected even when the browser exposes an empty value', () => {
    const game = setup();
    game.add('forest-tasks-form', 'forest-task-score', 10);
    const input = game.nodes.get('long_rail');
    input.value = '';
    Object.defineProperty(input, 'validity', { get: () => ({ badInput: true }) });
    game.run('saveGame()');
    assert.equal(game.state.writes, 0);
    assert.equal(input.focused, true);
});

test('unsafe aggregate totals and malformed task entries are not persisted', () => {
    const game = setup();
    game.nodes.get('long_rail').value = String(Number.MAX_SAFE_INTEGER);
    game.nodes.get('long_river').value = '1';
    game.run('saveGame()');
    assert.equal(game.state.writes, 0);
    assert.match(game.nodes.get('score-validation-message').textContent, /too large/);
    game.nodes.get('long_rail').value = '10';
    game.nodes.get('forest_tasks').dataset.taskScores = '[null]';
    game.run('saveGame()');
    assert.equal(game.state.writes, 0);
    assert.match(game.nodes.get('score-validation-message').textContent, /task entries/);
    game.nodes.get('forest_tasks').dataset.taskScores = 'not JSON';
    game.run('saveGame()');
    assert.equal(game.state.writes, 0);
});

test('a scorecard from the previous campaign cannot save into a newly started campaign', () => {
    const game = setup();
    game.add('forest-tasks-form', 'forest-task-score', 25);
    game.otherRecords.set('dorfExplorerCampaign', JSON.stringify({
        version: 1, mapRevision: 2, id: 'different-campaign', startedAt: '2026-10-23T12:00:00Z', moves: [], lengths: {}, players: ''
    }));
    game.run('saveGame()');
    assert.equal(game.state.writes, 0);
    assert.equal(game.state.location, '');
    assert.equal(Number(game.nodes.get('total_points').textContent), 25);
    assert.match(game.nodes.get('score-validation-message').textContent, /campaign has changed/);
});

test('failed saves preserve entered scores and existing Game History and allow retry', () => {
    const game = setup();
    game.add('forest-tasks-form', 'forest-task-score', 25);
    const original = game.state.data;
    const write = game.storage.setItem;
    game.storage.setItem = () => { const error = new Error('quota'); error.name = 'QuotaExceededError'; throw error; };
    game.run('saveGame()');
    assert.equal(game.state.data, original);
    assert.equal(game.state.location, '');
    assert.equal(Number(game.nodes.get('total_points').textContent), 25);
    assert.match(game.nodes.get('score-validation-message').textContent, /storage is full/);
    game.storage.setItem = write;
    game.run('saveGame()');
    assert.equal(JSON.parse(game.state.data)[0].total, 25);
});

test('corrupt or unavailable storage is reported without replacing saved records', () => {
    const game = setup();
    game.add('forest-tasks-form', 'forest-task-score', 25);
    for (const raw of ['{bad json', '{"wrong":"shape"}', '[{"id":"bad","total":-1,"scores":{}}]']) {
        game.state.data = raw;
        game.run('saveGame()');
        assert.equal(game.state.data, raw);
        assert.equal(game.state.writes, 0);
        assert.match(game.nodes.get('score-validation-message').textContent, /kept unchanged/);
    }
    game.storage.getItem = () => { throw new Error('Blocked storage'); };
    game.run('saveGame()');
    assert.equal(game.state.writes, 0);
    assert.match(game.nodes.get('score-validation-message').textContent, /storage is enabled/);
});

test('editing a game cannot modify history after the campaign is replaced', () => {
    const game = setup([{ id: 'old-game', total: 10, scores: { forest_tasks: 10 } }], 'old-game');
    game.add('forest-tasks-form', 'forest-task-score', 5);
    game.otherRecords.set('dorfExplorerCampaign', JSON.stringify({
        version: 1, mapRevision: 2, id: 'replacement', moves: [], lengths: {}, players: ''
    }));
    game.state.data = '[]';
    game.run('saveGame()');
    assert.equal(game.state.data, '[]');
    assert.equal(game.state.writes, 0);
    assert.equal(Number(game.nodes.get('total_points').textContent), 15);
    assert.match(game.nodes.get('score-validation-message').textContent, /campaign has changed/);
});

test('a scorecard cannot save after its campaign is completed in another tab', () => {
    const game = setup();
    game.add('forest-tasks-form', 'forest-task-score', 25);
    const current = JSON.parse(game.otherRecords.get('dorfExplorerCampaign'));
    current.completedAt = '2026-10-23T12:00:00Z';
    game.otherRecords.set('dorfExplorerCampaign', JSON.stringify(current));
    game.run('saveGame()');
    assert.equal(game.state.writes, 0);
    assert.equal(game.state.data, '[]');
    assert.equal(Number(game.nodes.get('total_points').textContent), 25);
    assert.match(game.nodes.get('score-validation-message').textContent, /campaign is complete/);
});
