import { ensureCampaignStarted, assertCampaignAssociation, assertCampaignEditable } from "./campaign-files.js?v=e8f9789fcdec";
import { readGames, writeStoredJSON, storageFailure } from "./data-store.js?v=e8f9789fcdec";
import { calculateScore } from "./scoring.js?v=e8f9789fcdec";
import { readScoreInput, isValidScore, scoreInputMessage, reportScoreError, clearScoreError } from "./validation.js?v=e8f9789fcdec";

let scorecardCampaignId = null;
let scorecardStorageError = null;

function editId() {
    return new URLSearchParams(window.location.search).get("edit");
}

export function loadGameForEditing() {
    if (!document.getElementById("save-game")) return null;
    try {
        const campaign = ensureCampaignStarted(localStorage, readGames(localStorage));
        readGames(localStorage, campaign.id);
        scorecardCampaignId = campaign.id;
        scorecardStorageError = null;
        const game = restoreGameForEditing();
        if (campaign.completedAt) {
            document.getElementById("save-game").disabled = true;
            const status = document.getElementById("editing-status");
            status.textContent = "This campaign is complete. Reopen it from Campaign before saving scores.";
            status.hidden = false;
        }
        return game;
    } catch (error) {
        scorecardStorageError = storageFailure(error, "read").message;
        reportScoreError(scorecardStorageError);
        const status = document.getElementById("editing-status");
        status.textContent = scorecardStorageError + " Reload this page after resolving the storage problem.";
        status.hidden = false;
        document.getElementById("save-game").disabled = true;
        return null;
    }
}

function restoreGameForEditing() {
    const id = editId();
    if (!id) return null;

    const game = readGames(localStorage, scorecardCampaignId).find(game => game.id === id);
    const status = document.getElementById("editing-status");
    status.hidden = false;
    if (!game) {
        status.textContent = "This saved game could not be found. Return to Game History to select a game.";
        document.getElementById("save-game").disabled = true;
        return null;
    }

    status.textContent = game.entries
        ? "Editing a saved game. Save changes to update its Game History record and Campaign movement points."
        : "Editing an older game. Only section totals were saved: tasks appear as one entry, flags in the first box, and hearts are distributed across the boxes. You can adjust these scores before saving.";
    document.querySelector("#save-game span").textContent = "Save Changes and View Game History";
    document.getElementById("cancel-edit").hidden = false;

    document.querySelectorAll(".score-input:not([type='hidden'])").forEach(input => {
        if (input.type === "checkbox") input.checked = Boolean(game.scores[input.id]);
        else input.value = game.scores[input.id] || "";
    });

    if (game.entries) {
        Object.entries(game.entries.inputs).forEach(([id, value]) => {
            const input = document.getElementById(id);
            if (input) {
                if (input.type === "checkbox") input.checked = Boolean(value);
                else input.value = value;
            }
        });
    } else {
        // Earlier saves recorded the checkbox value rather than its checked state.
        const sectionTotal = Object.entries(game.scores).reduce((sum, [key, score]) =>
            sum + (key === "circus" ? 0 : Number(score) || 0), 0);
        document.getElementById("circus").checked = game.total - sectionTotal === 10;
        ["forest", "grain", "village"].forEach(kind => {
            document.getElementById(`flag-${kind}-1`).value = game.scores[`flag_${kind}`] || "";
        });
        let hearts = Number(game.scores.heart_points) || 0;
        const goldenEdges = Math.max(0, Math.ceil((hearts - 18) / 2));
        document.getElementById("golden-heart-edges").value = goldenEdges;
        hearts -= goldenEdges * 2;
        [1, 2, 3].forEach(number => {
            const score = Math.min(6, hearts);
            document.getElementById(`heart-${number}-score`).value = score;
            hearts -= score;
        });
        document.getElementById("signalman-count").value = (game.scores.signalman_points || 0) / 2;
        document.getElementById("shepherdess-count").value = (game.scores.shepherdess_points || 0) / 2;
        document.getElementById("hill-count").value = (game.scores.hill_points || 0) / 2;
        document.getElementById("balloon-distance").value = (game.scores.balloon_points || 0) / 2;
    }
    return game;
}

export function saveGame() {
    try {
        if (scorecardStorageError) {
            reportScoreError(scorecardStorageError + " Reload this page after resolving the storage problem.");
            return;
        }
        assertCampaignEditable(localStorage, scorecardCampaignId);
        saveValidatedGame();
    } catch (error) {
        reportScoreError(storageFailure(error).message);
    }
}

function saveValidatedGame() {
    clearScoreError();
    const visibleInputs = document.querySelectorAll(".score-grid input:not([type='hidden'])");
    for (const input of visibleInputs) {
        if (input.type === "number" && readScoreInput(input) === null) {
            reportScoreError(scoreInputMessage(input), input);
            return;
        }
    }
    const scoreInputs = document.querySelectorAll(".score-input");

    for (const input of scoreInputs) {
        if (input.type !== "checkbox" && readScoreInput(input) === null) {
            reportScoreError("A section total is invalid or too large. Please correct the scores before saving.");
            return;
        }
    }

    const scores = {};

    scoreInputs.forEach(function (input) {
        scores[input.id] = input.type === "checkbox" ? Number(input.checked) : readScoreInput(input);
    });

    const total = calculateScore();

    if (!isValidScore(total)) {
        reportScoreError("The game total is invalid or too large. Please reduce the scores before saving.");
        return;
    }

    if (total <= 0) {
        window.alert("Enter some scores before saving this game.");
        return;
    }
    const games = readGames(localStorage, scorecardCampaignId);
    const id = editId();
    const index = id ? games.findIndex(game => game.id === id) : -1;
    if (id && index < 0) {
        window.alert("This game no longer exists in Game History. Your changes have not been saved.");
        return;
    }
    const entries = { inputs: {}, tasks: {} };
    try {
        for (const input of scoreInputs) {
            if (!input.dataset.taskScores) continue;
            const tasks = JSON.parse(input.dataset.taskScores);
            if (!Array.isArray(tasks) || !tasks.every(score => isValidScore(score, 1))) {
                throw new Error("Invalid task entries");
            }
            entries.tasks[input.id] = tasks;
        }
    } catch {
        reportScoreError("Some task entries are invalid. Remove or correct them before saving.");
        return;
    }
    visibleInputs.forEach(input => {
        // Unsubmitted task scores are not part of the saved total.
        if (!input.closest("form")) {
            entries.inputs[input.id] = input.type === "checkbox" ? input.checked : input.value;
        }
    });
    const game = {
        ...(index >= 0 ? games[index] : { id: crypto.randomUUID(), savedAt: new Date().toISOString() }),
        scores: scores,
        entries,
        campaignId: scorecardCampaignId,
        total: total
    };

    if (index >= 0) games[index] = game;
    else games.push(game);

    assertCampaignEditable(localStorage, scorecardCampaignId);
    writeStoredJSON(localStorage, "dorfExplorerGames", games.map(savedGame => ({ ...savedGame, campaignId: scorecardCampaignId })));

    window.location.assign(index >= 0 ? "campaign.html" : "campaign-tracker.html");
}
