import { readGames, writeStoredJSON, storageFailure } from "./data-store.js";
import { ensureCampaignStarted, assertCampaignEditable } from "./campaign-files.js";
import { loadGameRankings, findGameRanking } from "./rankings.js";
import { initialiseMovementSummary } from "./campaign-tracker.js";

const scoreLabels = {
    forest_tasks: "Forest tasks",
    grain_tasks: "Grain tasks",
    village_tasks: "Village tasks",
    rail_tasks: "Railway tasks",
    river_tasks: "River tasks",
    flag_forest: "Forest flags",
    flag_grain: "Grain flags",
    flag_village: "Village flags",
    harbour: "Harbour",
    train_station: "Train Station",
    long_rail: "Longest Railway",
    long_river: "Longest River",
    heart_points: "Hearts",
    harvest_points: "Harvest Festival",
    watchtower_points: "Watchtower",
    forest_cabin_points: "Forest Cabin",
    ship_points: "Ship",
    locomotive_points: "Locomotive",
    signalman_points: "Signalman",
    shepherdess_points: "Shepherdess",
    hill_points: "Hill",
    balloon_points: "Balloon Launch Site",
    circus: "Circus"
};

function escapeScoreLabel(value) {
    return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}


export async function initialiseCampaign() {
    const savedGamesList =
        document.getElementById("saved-games-list");

    if (!savedGamesList) {
        return;
    }

    const rankings = await loadGameRankings();

    const campaignId = ensureCampaignStarted(localStorage, readGames(localStorage)).id;
    const savedGames = readGames(localStorage, campaignId);

    savedGamesList.innerHTML = "";

    if (!savedGames.length) {
        savedGamesList.textContent = "No games saved yet. Use the Scorecard to record your first game.";
    }

    savedGames
        .slice()
        .reverse()
        .forEach(function (game) {
            const gameEntry =
                document.createElement("details");

            const savedDate = new Date(game.savedAt);

            const ranking =
                findGameRanking(game.total, rankings);

            const scoreBreakdown =
                Object.entries(game.scores)
                    .map(function ([scoreId, score]) {
                        const label =
                            scoreLabels[scoreId] || scoreId;

                        return `
                            <div class="score-breakdown-row">
                                <dt>${escapeScoreLabel(label)}</dt>
                                <dd>${scoreId === "circus" ? (score ? 10 : 0) : score}</dd>
                            </div>
                        `;
                    })
                    .join("");

            gameEntry.className = "saved-game";

            gameEntry.innerHTML = `
                <summary>
                    <span class="saved-game-total">
                        ${game.total} points
                    </span>

                    <span class="saved-game-ranking">
                        ${ranking.title}
                        ·
                        ${ranking.movementPoints}
                        movement points
                    </span>

                    <span class="saved-game-date">
                        ${savedDate.toLocaleDateString(
                            "en-GB",
                            {
                                day: "numeric",
                                month: "long",
                                year: "numeric"
                            }
                        )}
                        ·
                        ${savedDate.toLocaleTimeString(
                            "en-GB",
                            {
                                hour: "2-digit",
                                minute: "2-digit"
                            }
                        )}
                    </span>
                </summary>

                <div class="saved-game-details">
                    <h3>Score breakdown</h3>

                    <dl class="score-breakdown">
                        ${scoreBreakdown}
                    </dl>
                <div class="saved-game-actions">
                    <a class="edit-game-link button-link" href="scores.html?edit=${encodeURIComponent(game.id)}">Edit Score</a>
                    <button type="button" class="delete-game-button">
                        Delete this record
                    </button>
                </div>
                </div>
            `;
                        const deleteButton =
    gameEntry.querySelector(".delete-game-button");

    deleteButton.addEventListener("click", function () {
        const confirmed = window.confirm(
        `Delete the ${game.total}-point game?`
    );

    if (!confirmed) {
        return;
    }

    try {
    assertCampaignEditable(localStorage, campaignId);
    const currentGames = readGames(localStorage, campaignId);
    const remainingGames = currentGames.filter(
        function (savedGame) {
            return savedGame.id !== game.id;
        }
    );

    writeStoredJSON(localStorage, "dorfExplorerGames", remainingGames);

    gameEntry.remove();
    initialiseMovementSummary();
    } catch (error) {
        document.getElementById("history-movement-note").textContent = storageFailure(error).message;
    }
});
            savedGamesList.appendChild(gameEntry);
        });
}
