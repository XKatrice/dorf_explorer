const scoreLabels = {
    forest_tasks: "Forest tasks",
    grain_tasks: "Grain tasks",
    village_tasks: "Village tasks",
    rail_tasks: "Railway tasks",
    river_tasks: "River tasks",
    flag_forest: "Forest flags",
    flag_grain: "Grain flags",
    flag_village: "Village flags",
    longest_rail: "Longest railway",
    longest_river: "Longest river",
    harvest_points: "Harvest Festival",
    watchtower_points: "Watchtower",
    forest_cabin_points: "Forest Cabin",
    ship_points: "Ship",
    locomotive_points: "Locomotive"
};


async function loadGameRankings() {
    const response = await fetch("game_ranking.csv");

    if (!response.ok) {
        throw new Error("Could not load game rankings");
    }

    const csvText = await response.text();
    const rows = csvText.trim().split("\n");

    // Remove: Score,Title,Movement
    rows.shift();

    return rows.map(function (row) {
        const [score, title, movement] = row.split(",");

        return {
            minimumScore: Number(score.trim()),
            title: title.trim(),
            movementPoints: Number(movement.trim())
        };
    });
}


function findGameRanking(totalScore, rankings) {
    return rankings.find(function (ranking) {
        return totalScore >= ranking.minimumScore;
    });
}


export async function initialiseCampaign() {
    const savedGamesList =
        document.getElementById("saved-games-list");

    if (!savedGamesList) {
        return;
    }

    const rankings = await loadGameRankings();

    const savedGames =
        JSON.parse(
            localStorage.getItem("dorfExplorerGames")
        ) || [];

    savedGamesList.innerHTML = "";

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
                                <dt>${label}</dt>
                                <dd>${score}</dd>
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

    const remainingGames = savedGames.filter(
        function (savedGame) {
            return savedGame.id !== game.id;
        }
    );

    localStorage.setItem(
        "dorfExplorerGames",
        JSON.stringify(remainingGames)
    );

    gameEntry.remove();
});
            savedGamesList.appendChild(gameEntry);
        });
}