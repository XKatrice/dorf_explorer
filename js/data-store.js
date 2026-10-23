export const GAMES_KEY = "dorfExplorerGames";
export const CAMPAIGN_STORAGE_KEY = "dorfExplorerCampaign";
export const ARCHIVES_STORAGE_KEY = "dorfExplorerCampaignArchives";

const record = value => value !== null && typeof value === "object" && !Array.isArray(value);
const validNumber = value => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const validDate = value => typeof value === "string" && Number.isFinite(Date.parse(value));
const optionalDate = value => value === undefined || value === null || validDate(value);

function validGames(games) {
    if (!Array.isArray(games)) return false;
    const ids = new Set();
    return games.every(game => {
        if (!record(game) || typeof game.id !== "string" || !game.id || ids.has(game.id)
            || !validNumber(game.total) || !record(game.scores)
            || !Object.values(game.scores).every(validNumber) || !optionalDate(game.savedAt)
            || (game.campaignId !== undefined && (typeof game.campaignId !== "string" || !game.campaignId))) return false;
        ids.add(game.id);
        if (game.entries === undefined) return true;
        return record(game.entries) && record(game.entries.inputs) && record(game.entries.tasks)
            && Object.values(game.entries.inputs).every(value => typeof value === "boolean"
                || ((typeof value === "string" || typeof value === "number")
                    && (value === "" || validNumber(Number(value)))))
            && Object.values(game.entries.tasks).every(tasks => Array.isArray(tasks)
                && tasks.every(value => validNumber(value) && value > 0));
    });
}

function validCampaign(value) {
    return value === null || (record(value) && value.version === 1
        && (value.mapRevision === undefined || value.mapRevision === 2)
        && Array.isArray(value.moves) && value.moves.every(move => typeof move === "string")
        && (value.lengths === undefined || (record(value.lengths)
            && Object.values(value.lengths).every(length => validNumber(length) && length >= 1 && length <= 30)))
        && (value.id === undefined || value.id === null || (typeof value.id === "string" && value.id.length > 0))
        && (value.players === undefined || typeof value.players === "string")
        && optionalDate(value.startedAt) && optionalDate(value.completedAt)
        && (value.unlockDates === undefined || (record(value.unlockDates) && Object.values(value.unlockDates).every(validDate))));
}

function validStoredValue(key, value) {
    if (key === GAMES_KEY) return validGames(value);
    if (key === CAMPAIGN_STORAGE_KEY) return validCampaign(value);
    if (key === ARCHIVES_STORAGE_KEY) return Array.isArray(value) && value.every(file =>
        record(file) && file.format === "Dorf Explorer Campaign" && file.formatVersion === 1
        && record(file.campaign) && validGames(file.campaign.games)
        && validCampaign(file.campaign.progress) && optionalDate(file.campaign.startedAt)
        && optionalDate(file.campaign.completedAt));
    return false;
}

function storageLabel(key) {
    if (key === GAMES_KEY) return "Game History";
    if (key === ARCHIVES_STORAGE_KEY) return "Archived campaigns";
    return "Campaign";
}

export function storageFailure(error, operation = "save") {
    if (error?.name === "StorageError") return error;
    const full = error?.name === "QuotaExceededError" || /quota|storage full/i.test(error?.message || "");
    const problem = new Error(full
        ? "Browser storage is full. Your entries are still on this page. Free some browser storage and try again."
        : `Unable to ${operation} browser data. Check that storage is enabled for this site, then try again. Your entries have not been discarded.`);
    problem.name = "StorageError";
    return problem;
}

export function readStoredJSON(storage, key, fallback) {
    let raw;
    try { raw = storage.getItem(key); }
    catch (error) { throw storageFailure(error, "read"); }
    if (raw === null) return fallback;
    try {
        const value = JSON.parse(raw);
        if (!validStoredValue(key, value)) throw new Error("Invalid record");
        return value;
    } catch {
        const problem = new Error(`${storageLabel(key)} contains unreadable or invalid saved data. It has been kept unchanged; no replacement data was saved.`);
        problem.name = "StorageError";
        throw problem;
    }
}

export function writeStoredJSON(storage, key, value) {
    if (!validStoredValue(key, value)) {
        const problem = new Error(`${storageLabel(key)} could not be saved because its data is invalid. Existing data has been kept.`);
        problem.name = "StorageError";
        throw problem;
    }
    try { storage.setItem(key, JSON.stringify(value)); }
    catch (error) { throw storageFailure(error); }
}

export function readGames(storage, campaignId) {
    const games = readStoredJSON(storage, GAMES_KEY, []);
    if (campaignId && games.some(game => game.campaignId && game.campaignId !== campaignId)) {
        const problem = new Error("Game History belongs to a different campaign. The stored games have been kept unchanged. Reload the page before continuing.");
        problem.name = "StorageError";
        throw problem;
    }
    return games;
}

export function commitStoredRecords(storage, updates) {
    // Read and validate every affected record before making any changes.
    const originals = new Map();
    for (const { key, value } of updates) {
        if (!validStoredValue(key, value)) throw new Error("Cannot save invalid campaign data.");
        try { originals.set(key, storage.getItem(key)); }
        catch (error) { throw storageFailure(error, "read"); }
    }
    const written = [];
    try {
        for (const { key, value } of updates) {
            writeStoredJSON(storage, key, value);
            written.push(key);
        }
    } catch (error) {
        for (const key of written.reverse()) {
            try {
                const old = originals.get(key);
                if (old === null) storage.removeItem(key);
                else storage.setItem(key, old);
            } catch {
                // Keep the archive if the active data could not be restored.
                const problem = new Error("The campaign change could not finish or be fully rolled back. Your previous campaign backup has been retained in Archived campaigns. Do not clear browser storage.");
                problem.name = "StorageError";
                throw problem;
            }
        }
        throw storageFailure(error);
    }
}
