// Each route's cost includes the space at its destination, when applicable.
// See the English Sakura Campaign Pad published by Pegasus Spiele.
const movementRoutes = [
    ["Start", "Box 1", 2], ["Box 1", "Box 2", 4],
    ["Box 2", "Lake", 4], ["Box 2", "Crossroads", 4],
    ["Lake", "Box 3", 5], ["Crossroads", "Box 3", 5],
    ["Box 3", "Temples", 5], ["Temples", "Hot springs", 6],
    ["Hot springs", "Bridges", 7], ["Hot springs", "Gates", 7],
    ["Bridges", "Junction near Bridges", 3], ["Junction near Bridges", "Extra temple near Bridges", 1],
    ["Extra temple near Bridges", "Calligrapher", 4],
    ["Calligrapher", "Extra bridge", 5], ["Extra bridge", "Observatory", 4],
    ["Observatory", "Counting house", 10], ["Counting house", "Mt. Fuji", 11],
    ["Counting house", "Cartographer", 10], ["Gates", "Extra temple near Gates", 4],
    ["Extra temple near Gates", "Hermit", 4], ["Hermit", "Extra gate", 5],
    ["Extra gate", "Cartographer", 4], ["Cherry blossoms", "Mt. Fuji", 5]
];
const blossomRoutes = [
    ["Box 3", "Tea master", 8], ["Tea master", "Moss collector", 9],
    ["Moss collector", "Sumo wrestler", 10], ["Moss collector", "Rice farmer", 10],
    ["Sumo wrestler", "Onigiri", 11], ["Rice farmer", "Drinks", 11],
    ["Drinks", "Gift", 12], ["Onigiri", "Gift", 12], ["Gift", "Cherry blossoms", 13]
];

export const routes = [
    ...movementRoutes.map(([from, to, length]) => ({ from, to, length, currency: "movement" })),
    ...blossomRoutes.map(([from, to, length]) => ({ from, to, length, currency: "blossoms" }))
];

const junctions = new Set(["Junction near Bridges"]);
const graph = new Map();
function connect(a, b) {
    if (!graph.has(a)) graph.set(a, new Set());
    if (!graph.has(b)) graph.set(b, new Set());
    graph.get(a).add(b);
    graph.get(b).add(a);
}

routes.forEach((route, index) => {
    route.spaces = Array.from({ length: route.length - 1 }, (_, step) => `route-${index}-${step}`);
    const path = [route.from, ...route.spaces, route.to];
    path.slice(1).forEach((space, step) => connect(path[step], space));
});

export const cardAchievements = [
    "Bathing monkeys", "Bird lover", "Cherry tree & Village", "Colorful flag", "Daimyo", "Dam",
    "Dead end", "Emperor’s decree", "Gourmet", "Koi expert", "Master test", "Merchant",
    "Ox cart & Trading post", "Pilgrim", "Poet", "Rice & Cherry tree", "Ship & Pier",
    "Small clouds", "Village & Rice", "Warehouse", "Wraparound Tasks"
];

export const scoreGroups = [
    ["Completed tasks", [
        ["cherry", "Cherry tree task points"], ["rice", "Rice task points"], ["village", "Village task points"],
        ["road", "Road task points"], ["river", "River task points"],
        ["wraparound", "Wraparound task points"], ["double", "Completed double tasks", 7]
    ]],
    ["Flags and longest routes", [
        ["pinkFlag", "Tiles scored by pink flags"], ["greenFlag", "Tiles scored by green flags"],
        ["redFlag", "Tiles scored by red flags"], ["longRoad", "Tiles in longest road"],
        ["longRiver", "Tiles in longest river"], ["wraparoundBonus", "Wraparound matches on the longest road and river", 2]
    ]],
    ["Unlocked scoring", [
        ["temples", "Closed temples with matching edges", 6], ["springs", "Closed hot springs", 3],
        ["springsTasks", "Wraparound task bonuses from hot springs", 3], ["bridges", "Bridges on the longest river", 5],
        ["gates", "Gates on the longest road", 5], ["hermit", "Empty edges at the hermit", 3],
        ["observatory", "Closed flag territories scored by the observatory", 3],
        ["cartographer", "Tasks in the cartographer’s line of sight", 2],
        ["sumo", "Matching edges at the sumo wrestler"], ["moss", "Matching edges at the moss collector"],
        ["farmer", "Matching edges at the rice farmer"], ["ship", "Tiles between ship and pier"],
        ["ox", "Tiles between ox cart and trading post"], ["poet", "Meadow edges at the poet", 3]
    ]]
];

export const scoreUnlocks = {
    wraparound: ["Box 1", "Wraparound Tasks"], wraparoundBonus: ["Box 1", "Wraparound Tasks"],
    double: ["Cherry tree & Village", "Rice & Cherry tree", "Village & Rice"],
    temples: ["Temples"], springs: ["Hot springs"], springsTasks: ["Hot springs"],
    bridges: ["Bridges"], gates: ["Gates"], hermit: ["Hermit"], observatory: ["Observatory"],
    cartographer: ["Cartographer"], sumo: ["Sumo wrestler"], moss: ["Moss collector"], farmer: ["Rice farmer"],
    ship: ["Ship & Pier"], ox: ["Ox cart & Trading post"], poet: ["Poet"],
    blossoms: ["Box 3", "Tea master", "Bird lover", "Koi expert", "Gourmet", "Merchant", "Pilgrim", "Cherry blossoms"]
};

export function scorecardUnlocks(reached, achievements, game) {
    if (Array.isArray(game?.unlockedScores)) return new Set(game.unlockedScores);
    // Older scorecards kept totals but did not record which cards were unlocked.
    if (game) return new Set(Object.keys(scoreUnlocks).filter(id =>
        game.entries[id] > 0 || (id === "blossoms" && (game.scoreBlossoms || game.entries.blossomsForCards > 0))));
    const unlocked = new Set([...reached, ...achievements]);
    return new Set(Object.entries(scoreUnlocks).filter(([, names]) =>
        names.some(name => unlocked.has(name))).map(([id]) => id));
}

export function scoreGame(entries, scoreBlossoms) {
    return scoreGroups.flatMap(([, fields]) => fields).reduce((total, [id, , multiplier = 1]) =>
        total + (entries[id] || 0) * multiplier, scoreBlossoms ? Math.min(entries.blossoms || 0, 50) : 0);
}

// The first score in each movement bracket, from the publisher's campaign pad.
const movementThresholds = [0, 110, 130, 150, 170, 190, 210, 230, 250, 270, 290, 320, 350, 380, 410, 440];

export function movementForScore(score) {
    return movementThresholds.filter(minimum => score >= minimum).length;
}

export function campaignProgress(games, moves) {
    const reached = new Set(["Start", ...moves.map(move => move.space)]);
    const latestGame = games.at(-1);
    const movement = games.reduce((total, game) => total + movementForScore(game.total), 0)
        - moves.filter(move => move.currency === "movement").length;
    const blossoms = (latestGame?.entries.blossoms || 0) - (latestGame?.entries.blossomsForCards || 0) - moves.reduce((total, move) =>
        total + (move.currency === "blossoms" && move.gameId === latestGame?.id ? move.cost : 0), 0);
    return { reached, movement, blossoms, latestGame };
}

export function nextRouteMoves(route, progress) {
    const path = [route.from, ...route.spaces, route.to];
    return path.filter(space => {
        if (progress.reached.has(space)) return false;
        if (space === "Cherry blossoms" && route.currency === "movement") return false;
        return [...graph.get(space)].some(neighbour => path.includes(neighbour) && progress.reached.has(neighbour));
    });
}

export const routeAchievements = [...new Set(routes.map(route => route.to))]
    .filter(name => !junctions.has(name) && !name.startsWith("Box ") && !name.startsWith("Extra "));
