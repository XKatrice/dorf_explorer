const assert = require('node:assert/strict');
const test = require('node:test');

test('unlocked cards follow campaign progress for new games and recorded scoring for edits', async () => {
    const { scorecardUnlocks } = await import('../js/sakura-rules.js');
    assert.equal(scorecardUnlocks(new Set(['Start']), []).size, 0);
    const unlocked = scorecardUnlocks(new Set(['Box 1', 'Temples']), ['Ship & Pier']);
    assert.deepEqual([...unlocked].sort(), ['ship', 'temples', 'wraparound', 'wraparoundBonus']);
    assert.deepEqual([...scorecardUnlocks(new Set(['Temples']), [], { unlockedScores: [] })], []);
    assert.deepEqual([...scorecardUnlocks(new Set(), [], { entries: { double: 2, blossomsForCards: 3 } })],
        ['double', 'blossoms']);
});

test('Sakura scores completed tasks, longest routes, flags, and unlocked bonuses', async () => {
    const { scoreGame } = await import('../js/sakura-rules.js');
    const entries = { cherry: 4, rice: 9, village: 4, road: 14, river: 5, greenFlag: 5, longRoad: 8, longRiver: 5 };
    assert.equal(scoreGame(entries, false), 54);
    assert.equal(scoreGame({ ...entries, blossoms: 34, double: 2, wraparoundBonus: 1, temples: 2 }, false), 82);
    assert.equal(scoreGame({ ...entries, blossoms: 55 }, true), 104);
});

test('Sakura movement opens both paths from Box 2 and uses Sakura score brackets', async () => {
    const { campaignProgress, movementForScore, nextRouteMoves, routes } = await import('../js/sakura-rules.js');
    assert.deepEqual([109, 110, 156, 171, 269, 270, 439, 440, 600].map(movementForScore),
        [1, 2, 4, 5, 9, 10, 15, 16, 16]);
    const games = [{ id: 'game', total: 171, entries: {} }, { id: 'second', total: 171, entries: {} }];
    const moves = [];
    for (const route of routes.slice(0, 2)) {
        for (const expected of route.spaces) {
            const progress = campaignProgress(games, moves);
            const [space] = nextRouteMoves(route, progress);
            assert.equal(space, expected);
            moves.push({ space, currency: route.currency });
        }
    }
    const progress = campaignProgress(games, moves);
    assert.equal(progress.movement, 6);
    assert.ok(progress.reached.has('Box 2'));
    assert.equal(nextRouteMoves(routes.find(route => route.to === 'Lake'), progress).length, 1);
    assert.equal(nextRouteMoves(routes.find(route => route.to === 'Crossroads'), progress).length, 1);
});

test('Sakura boxes open on the last available point and legacy box charges are returned', async () => {
    const { campaignProgress, nextRouteMoves, routes } = await import('../js/sakura-rules.js');
    const firstRoute = routes[0];
    const firstGame = { id: 'first', total: 109, entries: {} };
    const firstStep = { space: firstRoute.spaces[0], currency: 'movement', cost: 1 };
    const atBoxOne = campaignProgress([firstGame], [firstStep]);
    assert.equal(atBoxOne.movement, 0);
    assert.ok(atBoxOne.reached.has('Box 1'));
    assert.ok(!campaignProgress([firstGame], []).reached.has('Box 1'));
    assert.deepEqual(nextRouteMoves(firstRoute, atBoxOne), []);

    for (const branch of ['Lake', 'Crossroads']) {
        const path = [firstRoute, routes[1], routes.find(route => route.to === branch),
            routes.find(route => route.from === branch && route.to === 'Box 3')];
        const legacyMoves = path.flatMap(route => [...route.spaces, route.to]
            .map(space => ({ space, currency: 'movement', cost: 1 })));
        const games = [{ id: 'legacy', total: 440, entries: { blossoms: 8 } }];
        const legacyProgress = campaignProgress(games, legacyMoves);
        assert.equal(legacyProgress.movement, 4);
        for (const box of ['Box 1', 'Box 2', 'Box 3']) assert.ok(legacyProgress.reached.has(box));
        assert.equal(nextRouteMoves(routes.find(route => route.to === 'Tea master'), legacyProgress).length, 1);
        assert.equal(nextRouteMoves(routes.find(route => route.to === 'Temples'), legacyProgress).length, 1);
        assert.equal(legacyProgress.blossoms, 8);
        assert.deepEqual(campaignProgress(games, legacyMoves), legacyProgress);
    }
});

test('only unspent blossoms from the latest game can be used on the campaign', async () => {
    const { campaignProgress } = await import('../js/sakura-rules.js');
    const games = [
        { id: 'game-one', total: 171, entries: { blossoms: 40 } },
        { id: 'game-two', total: 171, entries: { blossoms: 35, blossomsForCards: 4 } }
    ];
    const moves = [
        { space: 'Tea master', currency: 'blossoms', cost: 1, gameId: 'game-one' },
        { space: 'Cherry blossoms', currency: 'blossoms', cost: 30, gameId: 'game-two' }
    ];
    assert.equal(campaignProgress(games, moves).blossoms, 1);
});
