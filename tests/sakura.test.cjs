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
        for (let step = 0; step < route.length; step++) {
            const progress = campaignProgress(games, moves);
            const [space] = nextRouteMoves(route, progress);
            assert.ok(space);
            moves.push({ space, currency: route.currency });
        }
    }
    const progress = campaignProgress(games, moves);
    assert.equal(progress.movement, 4);
    assert.ok(progress.reached.has('Box 2'));
    assert.equal(nextRouteMoves(routes.find(route => route.to === 'Lake'), progress).length, 1);
    assert.equal(nextRouteMoves(routes.find(route => route.to === 'Crossroads'), progress).length, 1);
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
