import { calculateScore } from "./scoring.js";


function calculateDoubledTasks(scores) {
    const subtotal = scores.reduce(function (total, score) {
        return total + score;
    }, 0);

    return subtotal * 2;
}


function initialiseDoubledTaskSpecial(config) {
    const scores = [];

    const form = document.getElementById(config.formId);
    const input = document.getElementById(config.inputId);
    const scoreList = document.getElementById(config.scoreListId);
    const subtotalDisplay =
        document.getElementById(config.subtotalId);
    const totalDisplay =
        document.getElementById(config.totalId);
    const pointsInput =
        document.getElementById(config.pointsInputId);

    if (!form) {
        return;
    }

    function renderScores() {
        scoreList.innerHTML = "";

        scores.forEach(function (score, index) {
            const button = document.createElement("button");

            button.type = "button";
            button.className =
                `score-chip ${config.chipClass}`;

            button.textContent = score;

            button.setAttribute(
                "aria-label",
                `Remove task worth ${score} points`
            );

            button.addEventListener("click", function () {
                scores.splice(index, 1);
                updateScore();
            });

            scoreList.appendChild(button);
        });
    }

    function updateScore() {
        const subtotal = scores.reduce(
            function (total, score) {
                return total + score;
            },
            0
        );

        const doubledTotal =
            calculateDoubledTasks(scores);

        subtotalDisplay.textContent = subtotal;
        totalDisplay.textContent = doubledTotal;
        pointsInput.value = doubledTotal;

        renderScores();
        calculateScore();
    }

    form.addEventListener("submit", function (event) {
        event.preventDefault();

        const score = Number(input.value);

        if (score <= 0) {
            return;
        }

        scores.push(score);

        input.value = "";
        input.focus();

        updateScore();
    });
}

export function initialiseSpecials() {
    initialiseDoubledTaskSpecial({
        formId: "harvest-form",
        inputId: "harvest-task-score",
        scoreListId: "harvest-score-list",
        subtotalId: "harvest-subtotal",
        totalId: "harvest-total",
        pointsInputId: "harvest_points",
        chipClass: "score-chip--field"
    });

    initialiseDoubledTaskSpecial({
        formId: "watchtower-form",
        inputId: "watchtower-task-score",
        scoreListId: "watchtower-score-list",
        subtotalId: "watchtower-subtotal",
        totalId: "watchtower-total",
        pointsInputId: "watchtower_points",
        chipClass: "score-chip--village"
    });

    initialiseDoubledTaskSpecial({
    formId: "forest-cabin-form",
    inputId: "forest-cabin-task-score",
    scoreListId: "forest-cabin-score-list",
    subtotalId: "forest-cabin-subtotal",
    totalId: "forest-cabin-total",
    pointsInputId: "forest_cabin_points",
    chipClass: "score-chip--forest"
});

initialiseDoubledTaskSpecial({
    formId: "ship-form",
    inputId: "ship-task-score",
    scoreListId: "ship-score-list",
    subtotalId: "ship-subtotal",
    totalId: "ship-total",
    pointsInputId: "ship_points",
    chipClass: "score-chip--river"
});

initialiseDoubledTaskSpecial({
    formId: "locomotive-form",
    inputId: "locomotive-task-score",
    scoreListId: "locomotive-score-list",
    subtotalId: "locomotive-subtotal",
    totalId: "locomotive-total",
    pointsInputId: "locomotive_points",
    chipClass: "score-chip--railway"
});
}
