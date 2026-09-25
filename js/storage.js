export function saveGame() {
    const scoreInputs = document.querySelectorAll(".score-input");

    const scores = {};

    scoreInputs.forEach(function (input) {
        scores[input.id] = Number(input.value) || 0;
    })

    const total = Number(
    document.getElementById("total_points").textContent);

    if (total <= 0) {
    window.alert(
        "Enter some scores before saving this game."
    );

    return;
}
    const game = {
        id: crypto.randomUUID(),
        savedAt: new Date().toISOString(),
        scores: scores,
        total: total
    };

    const savedGames =
        JSON.parse(localStorage.getItem("dorfExplorerGames")) || [];

    savedGames.push(game);

    localStorage.setItem(
        "dorfExplorerGames",
        JSON.stringify(savedGames)
    );

     window.location.assign("campaign.html");

    console.log("Game saved:", game);
}