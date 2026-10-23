import { findGameRanking } from "./rankings.js?v=a8d45964ab16";
import { readStoredJSON } from "./data-store.js?v=a8d45964ab16";

export const CAMPAIGN_KEY = "dorfExplorerCampaign";
const MAP_REVISION = 2;
const PREVIOUS_LENGTHS = {
    "start-box1": 3, "box1-box2": 4, "warehouse-signalman": 4, "circus-signalman": 4,
    "grain-village": 7, "signalman-shepherdess": 7, "deer-castle": 7,
    "village-forest": 8, "shepherdess-hill": 8, "castle-farm": 8,
    "forest-clouds": 9, "hill-clouds": 9, "farm-clouds": 9
};

// Coordinates follow the printed sheet, from the hiker at the bottom to Clouds at the top.
export const CAMPAIGN_NODES = [
    { id: "start", name: "Start", x: 450, y: 1350, kind: "start" },
    { id: "box1", name: "Open Box 1", x: 450, y: 1170, kind: "box" },
    { id: "box2", name: "Open Box 2", x: 450, y: 980, kind: "box" },
    { id: "warehouse", name: "Warehouse", x: 180, y: 980 },
    { id: "circus", name: "Circus", x: 720, y: 980 },
    { id: "grain", name: "Grain Tunnel", x: 180, y: 760 },
    { id: "signalman", name: "Signalman", x: 450, y: 760 },
    { id: "deer", name: "Deer", x: 720, y: 760 },
    { id: "village", name: "Village Tunnel", x: 180, y: 540 },
    { id: "shepherdess", name: "Shepherdess", x: 450, y: 540 },
    { id: "castle", name: "Castle", x: 720, y: 540 },
    { id: "forest", name: "Forest Tunnel", x: 180, y: 320 },
    { id: "hill", name: "Hill", x: 450, y: 320 },
    { id: "farm", name: "Farm", x: 720, y: 320 },
    { id: "clouds", name: "Clouds", x: 450, y: 100 }
];

export const CAMPAIGN_PATHS = [
    { id: "start-box1", from: "start", to: "box1", length: 2 },
    { id: "box1-box2", from: "box1", to: "box2", length: 5 },
    { id: "box2-warehouse", from: "box2", to: "warehouse", length: 4 },
    { id: "box2-circus", from: "box2", to: "circus", length: 4 },
    { id: "warehouse-grain", from: "warehouse", to: "grain", length: 6, bend: -100 },
    { id: "warehouse-signalman", from: "warehouse", to: "signalman", length: 6 },
    { id: "circus-deer", from: "circus", to: "deer", length: 6, bend: 100 },
    { id: "circus-signalman", from: "circus", to: "signalman", length: 6 },
    { id: "grain-village", from: "grain", to: "village", length: 8, bend: -100, heart: 4 },
    { id: "signalman-shepherdess", from: "signalman", to: "shepherdess", length: 8, bend: 100, heart: 4 },
    { id: "deer-castle", from: "deer", to: "castle", length: 8, bend: 100, heart: 4 },
    { id: "village-forest", from: "village", to: "forest", length: 10, bend: -100 },
    { id: "shepherdess-hill", from: "shepherdess", to: "hill", length: 10, bend: -100 },
    { id: "castle-farm", from: "castle", to: "farm", length: 10, bend: 100 },
    { id: "forest-clouds", from: "forest", to: "clouds", length: 10 },
    { id: "hill-clouds", from: "hill", to: "clouds", length: 10, bend: 100 },
    { id: "farm-clouds", from: "farm", to: "clouds", length: 10 }
];

export function pathLength(path, state) {
    return state.lengths?.[path.id] ?? path.length;
}

export function stepId(path, index) {
    return `${path.id}:${index}`;
}

export function movementEarned(games, rankings) {
    // Points are derived from each current game once; there is no separate award to duplicate.
    const seen = new Set();
    return games.reduce((sum, game) => {
        if (seen.has(game.id)) return sum;
        seen.add(game.id);
        return sum + (findGameRanking(Number(game.total), rankings)?.movementPoints || 0);
    }, 0);
}

function adjacency(state) {
    const graph = new Map(CAMPAIGN_NODES.map(node => [node.id, new Set()]));
    function connect(a, b) {
        if (!graph.has(a)) graph.set(a, new Set());
        if (!graph.has(b)) graph.set(b, new Set());
        graph.get(a).add(b);
        graph.get(b).add(a);
    }
    CAMPAIGN_PATHS.forEach(path => {
        let previous = path.from;
        for (let index = 1; index <= pathLength(path, state); index++) {
            const id = stepId(path, index);
            connect(previous, id);
            previous = id;
        }
        connect(previous, path.to);
    });
    return graph;
}

export function campaignProgress(state, earned) {
    const graph = adjacency(state);
    const spent = new Set(state.moves);
    const reached = new Set(["start"]);
    const queue = ["start"];
    for (let i = 0; i < queue.length; i++) {
        for (const neighbour of graph.get(queue[i])) {
            // Hexes cost nothing; circles must have been bought before they can be traversed.
            if (!reached.has(neighbour) && (!neighbour.includes(":") || spent.has(neighbour))) {
                reached.add(neighbour);
                queue.push(neighbour);
            }
        }
    }
    const availableSteps = new Set();
    reached.forEach(id => graph.get(id).forEach(neighbour => {
        if (neighbour.includes(":") && !spent.has(neighbour)) availableSteps.add(neighbour);
    }));
    const hearts = CAMPAIGN_PATHS.filter(path => path.heart && spent.has(stepId(path, Math.min(path.heart, pathLength(path, state))))).length;
    return {
        earned, spent: spent.size, balance: earned - spent.size, reached, availableSteps, hearts,
        unlocked: CAMPAIGN_NODES.filter(node => node.id !== "start" && reached.has(node.id))
    };
}

export function campaignAchievements(state) {
    const progress = campaignProgress(state, Infinity);
    const achievements = CAMPAIGN_NODES.filter(node => node.id !== "start").map(node => ({
        id: node.id, name: node.name, unlocked: progress.reached.has(node.id)
    }));
    CAMPAIGN_PATHS.filter(path => path.heart).forEach((path, index) => {
        achievements.push({
            id: `heart:${path.id}`, name: `Red Heart ${index + 1}`,
            unlocked: state.moves.includes(stepId(path, Math.min(path.heart, pathLength(path, state))))
        });
    });
    return achievements.map(achievement => ({
        ...achievement, unlockedAt: achievement.unlocked ? state.unlockDates?.[achievement.id] || null : null
    }));
}

export function spendMovement(state, id, earned, unlockedAt = new Date().toISOString()) {
    const progress = campaignProgress(state, earned);
    if (progress.balance <= 0) throw new Error("No movement points available. Save another game or undo a move.");
    if (!progress.availableSteps.has(id)) throw new Error("Choose a circle beside your existing progress.");
    const next = { ...state, moves: [...state.moves, id], unlockDates: { ...state.unlockDates } };
    if (unlockedAt) {
        const previouslyUnlocked = new Set(campaignAchievements(state).filter(item => item.unlocked).map(item => item.id));
        campaignAchievements(next).forEach(item => {
            if (item.unlocked && !previouslyUnlocked.has(item.id)) next.unlockDates[item.id] = unlockedAt;
        });
    }
    return next;
}

export function changePathLength(state, id, length) {
    if (!CAMPAIGN_PATHS.some(path => path.id === id)) throw new Error("Unknown campaign path.");
    if (!Number.isInteger(length) || length < 1 || length > 30) throw new Error("Enter a whole number from 1 to 30.");
    if (state.moves.some(move => move.startsWith(id + ":"))) {
        throw new Error("Undo movement on this path before changing its length.");
    }
    return { ...state, lengths: { ...state.lengths, [id]: length } };
}

export function readCampaignState(storage) {
    const saved = readStoredJSON(storage, CAMPAIGN_KEY, null);
    if (!saved) return { version: 1, mapRevision: MAP_REVISION, moves: [], lengths: {}, players: "" };
    if (saved.version !== 1 || !Array.isArray(saved.moves)) throw new Error("Campaign data could not be read. Your saved progress has been kept.");
    const correctingPaths = saved.mapRevision === undefined;
    let state = {
        version: 1, mapRevision: MAP_REVISION, moves: [], lengths: {}, players: String(saved.players || ""),
        id: saved.id || null, startedAt: saved.startedAt || null, completedAt: saved.completedAt || null
    };
    for (const [id, length] of Object.entries(saved.lengths || {})) {
        // The old settings form saved defaults too; replace those while retaining custom counts.
        if (correctingPaths && length === PREVIOUS_LENGTHS[id]) continue;
        state = changePathLength(state, id, length);
    }
    // Replay checks connectivity and rejects corrupted data without overwriting it.
    let refunded = 0;
    for (const move of saved.moves) {
        const pathId = typeof move === "string" ? move.split(":")[0] : "";
        if (!CAMPAIGN_PATHS.some(path => path.id === pathId)) throw new Error("Unknown campaign path in saved progress.");
        if (correctingPaths && !campaignProgress(state, Infinity).availableSteps.has(move)) {
            // Changed lengths can remove circles or delay later unlocks. Refund those moves.
            refunded++;
            continue;
        }
        state = spendMovement(state, move, Infinity, null);
    }
    // Earlier campaigns have no recorded dates; never invent historical unlock dates.
    state.unlockDates = {};
    campaignAchievements(state).forEach(item => {
        const date = saved.unlockDates?.[item.id];
        if (item.unlocked && typeof date === "string" && !Number.isNaN(Date.parse(date))) {
            state.unlockDates[item.id] = date;
        }
    });
    if (refunded) state.pathCorrectionRefund = refunded;
    return state;
}
