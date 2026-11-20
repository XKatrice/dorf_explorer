export function initialiseCardNavigation(root = document, scoreboard = document.getElementById("scoreboard-heading")) {
    const allCards = Array.from(root.querySelectorAll(".score-grid .score-item"));
    allCards.forEach(card => card.querySelector(".next-card-button")?.remove());
    const cards = allCards.filter(card => !card.hidden);
    const inputSelector = 'input:not([type="hidden"]):not(:disabled)';

    cards.forEach(function (card, index) {
        const nextCard = cards[index + 1];
        const target = nextCard ? nextCard.querySelector(inputSelector) : scoreboard;

        if (!target) {
            return;
        }

        const nextName = nextCard
            ? nextCard.querySelector("h3, label").textContent.trim()
            : "Scoreboard";
        const button = document.createElement("button");
        button.type = "button";
        button.className = "next-card-button";
        button.textContent = nextCard ? "Next" : "View scoreboard";
        button.setAttribute("aria-label", `Next: ${nextName}`);
        button.addEventListener("click", function () {
            target.focus({ preventScroll: true });
            (nextCard || scoreboard).scrollIntoView({ block: "center" });
        });
        card.appendChild(button);
    });
}
