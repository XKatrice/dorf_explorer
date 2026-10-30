import { CAMPAIGN_KEY, readCampaignState, campaignAchievements, campaignProgress, movementEarned } from "./campaign-model.js?v=4e224e0d154c";
import { findGameRanking } from "./rankings.js?v=4e224e0d154c";
import { readGames, readStoredJSON, writeStoredJSON, commitStoredRecords } from "./data-store.js?v=4e224e0d154c";

export const ARCHIVE_KEY = "dorfExplorerCampaignArchives";

export function ensureCampaignStarted(storage, games, now = new Date().toISOString()) {
    const state = readCampaignState(storage);
    const gameCampaigns = new Set(games.map(game => game.campaignId).filter(Boolean));
    if (gameCampaigns.size > 1 || (state.id && [...gameCampaigns].some(id => id !== state.id))) {
        const problem = new Error("Game History contains records for a different campaign. All saved data has been kept unchanged. Reload before continuing.");
        problem.name = "StorageError";
        throw problem;
    }
    if (state.id && state.startedAt) return state;
    const dates = games.map(game => game.savedAt).filter(date => !Number.isNaN(Date.parse(date))).sort();
    const next = { ...state, id: state.id || [...gameCampaigns][0] || crypto.randomUUID(), startedAt: state.startedAt || dates[0] || now };
    writeStoredJSON(storage, CAMPAIGN_KEY, next);
    return next;
}

export function buildCampaignFile(state, games, rankings, exportedAt = new Date().toISOString()) {
    const totalScore = games.reduce((total, game) => total + Number(game.total || 0), 0);
    const highest = games.reduce((best, game) => !best || Number(game.total) > Number(best.total) ? game : best, null);
    const progress = campaignProgress(state, movementEarned(games, rankings));
    return {
        format: "Dorf Explorer Campaign", formatVersion: 1, exportedAt,
        campaign: {
            id: state.id, startedAt: state.startedAt || null, completedAt: state.completedAt || null,
            status: state.completedAt ? "Completed" : "In progress", playerNames: state.players,
            totalGames: games.length, totalScore,
            highestScoringGame: highest ? { id: highest.id, savedAt: highest.savedAt, score: Number(highest.total) } : null,
            movement: { earned: progress.earned, spent: progress.spent, balance: progress.balance },
            achievements: [...campaignAchievements(state), ...(state.manualAchievements || []).map(item => ({
                id: item.id, name: item.name, criteria: item.criteria, target: item.target,
                recordedScore: item.recordedScore, unlocked: Boolean(item.completedAt), unlockedAt: item.completedAt
            }))],
            games: games.map(game => ({ ...game, ranking: findGameRanking(Number(game.total), rankings) || null })),
            progress: state
        }
    };
}

export function startNewCampaign(storage, rankings, now = new Date().toISOString()) {
    const games = readGames(storage);
    const archives = readStoredJSON(storage, ARCHIVE_KEY, []);
    const current = ensureCampaignStarted(storage, games, now);
    readGames(storage, current.id);
    const snapshot = buildCampaignFile(current, games, rankings, now);
    archives.push(snapshot);
    const next = { version: 1, mapRevision: 2, id: crypto.randomUUID(), startedAt: now, completedAt: null,
        players: "", moves: [], lengths: {}, unlockDates: {} };
    commitStoredRecords(storage, [
        { key: ARCHIVE_KEY, value: archives },
        { key: "dorfExplorerGames", value: [] },
        { key: CAMPAIGN_KEY, value: next }
    ]);
    return next;
}

export function assertCampaignAssociation(storage, expectedId) {
    const current = readCampaignState(storage);
    if (!expectedId || current.id !== expectedId) {
        const problem = new Error("The active campaign has changed. Your scores are still on this page and have not been saved. Open a new scorecard for the current campaign.");
        problem.name = "StorageError";
        throw problem;
    }
    return current;
}

export function assertCampaignEditable(storage, expectedId) {
    const current = assertCampaignAssociation(storage, expectedId);
    if (current.completedAt) {
        const problem = new Error("This campaign is complete. Reopen it from Campaign before adding or changing games or movement points.");
        problem.name = "StorageError";
        throw problem;
    }
    return current;
}

export function parseCampaignFile(text) {
    let file;
    try {
        file = JSON.parse(text);
        readStoredJSON({ getItem: () => JSON.stringify([file]) }, ARCHIVE_KEY, []);
        if (!file.campaign.progress || typeof file.campaign.playerNames !== "string") throw new Error("Missing campaign details");
        const state = readCampaignState({ getItem: () => JSON.stringify(file.campaign.progress) });
        state.id = state.id || file.campaign.id || crypto.randomUUID();
        state.players = file.campaign.playerNames;
        state.startedAt = state.startedAt || file.campaign.startedAt || null;
        state.completedAt = state.completedAt || file.campaign.completedAt || null;
        readGames({ getItem: () => JSON.stringify(file.campaign.games) }, state.id);
        return { state, games: file.campaign.games };
    } catch {
        throw new Error("This is not a valid Dorf Explorer campaign file, or its saved progress is invalid. Your current campaign has not been changed.");
    }
}

export function importCampaignFile(storage, text, rankings, now = new Date().toISOString()) {
    const imported = parseCampaignFile(text);
    const archives = readStoredJSON(storage, ARCHIVE_KEY, []);
    const games = readGames(storage);
    const current = ensureCampaignStarted(storage, games, now);
    readGames(storage, current.id);
    archives.push(buildCampaignFile(current, games, rankings, now));
    // A new active ID also invalidates scorecards opened before restoring this same campaign.
    const next = { ...imported.state, id: crypto.randomUUID() };
    const restoredGames = imported.games.map(game => ({ ...game, campaignId: next.id }));
    commitStoredRecords(storage, [
        { key: ARCHIVE_KEY, value: archives },
        { key: "dorfExplorerGames", value: restoredGames },
        { key: CAMPAIGN_KEY, value: next }
    ]);
    return next;
}

export function downloadCampaignFile(file) {
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `dorf-campaign-${(file.campaign.startedAt || file.exportedAt).slice(0, 10)}-${file.campaign.id || "export"}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
