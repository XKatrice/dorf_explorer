export function saveGame() {
    const scoreInputs = document.querySelectorAll(".score-input");

    const scores = {};

    scoreInputs.forEach(function (input) {
        scores[input.id] = Number(input.value) || 0;
    });

    const game = {
        id: crypto.randomUUID(),
        savedAt: new Date().toISOString(),
        scores: scores,
        total: Number(
            document.getElementById("total_points").textContent
        ) || 0
    };

    const savedGames =
        JSON.parse(localStorage.getItem("dorfExplorerGames")) || [];

    savedGames.push(game);

    localStorage.setItem(
        "dorfExplorerGames",
        JSON.stringify(savedGames)
    );

    console.log("Game saved:", game);
}