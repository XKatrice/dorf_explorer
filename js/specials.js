import { calculateScore } from "./scoring.js";



function calculateTaskTotal(scores, multiplier) {
    const subtotal = scores.reduce(function (total, score) {
        return total + score;
    }, 0);

    return subtotal * multiplier;
}


function initialiseTaskEntry(config) {
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

        const finalTotal =
            calculateTaskTotal(scores, config.multiplier);

        subtotalDisplay.textContent = subtotal;
        totalDisplay.textContent = finalTotal;
        pointsInput.value = finalTotal;

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
    initialiseTaskEntry({
        formId: "harvest-form",
        inputId: "harvest-task-score",
        scoreListId: "harvest-score-list",
        subtotalId: "harvest-subtotal",
        totalId: "harvest-total",
        pointsInputId: "harvest_points",
        chipClass: "score-chip--field",
        multiplier: 2
    });

    initialiseTaskEntry({
        formId: "watchtower-form",
        inputId: "watchtower-task-score",
        scoreListId: "watchtower-score-list",
        subtotalId: "watchtower-subtotal",
        totalId: "watchtower-total",
        pointsInputId: "watchtower_points",
        chipClass: "score-chip--village",
        multiplier: 2
    });

    initialiseTaskEntry({
    formId: "forest-cabin-form",
    inputId: "forest-cabin-task-score",
    scoreListId: "forest-cabin-score-list",
    subtotalId: "forest-cabin-subtotal",
    totalId: "forest-cabin-total",
    pointsInputId: "forest_cabin_points",
    chipClass: "score-chip--forest",
    multiplier: 2
});

initialiseTaskEntry({
    formId: "ship-form",
    inputId: "ship-task-score",
    scoreListId: "ship-score-list",
    subtotalId: "ship-subtotal",
    totalId: "ship-total",
    pointsInputId: "ship_points",
    chipClass: "score-chip--river",
    multiplier: 2
});

initialiseTaskEntry({
    formId: "locomotive-form",
    inputId: "locomotive-task-score",
    scoreListId: "locomotive-score-list",
    subtotalId: "locomotive-subtotal",
    totalId: "locomotive-total",
    pointsInputId: "locomotive_points",
    chipClass: "score-chip--railway",
    multiplier: 2
});

initialiseTaskEntry({
    formId: "forest-tasks-form",
    inputId: "forest-task-score",
    scoreListId: "forest-task-score-list",
    subtotalId: "forest-task-subtotal",
    totalId: "forest-task-total",
    pointsInputId: "forest_tasks",
    chipClass: "score-chip--forest",
    multiplier: 1
});

initialiseTaskEntry({
    formId: "grain-tasks-form",
    inputId: "grain-task-score",
    scoreListId: "grain-task-score-list",
    subtotalId: "grain-subtotal",
    totalId: "grain-total",
    pointsInputId: "grain_tasks",
    chipClass: "score-chip--field",
    multiplier: 1
});

initialiseTaskEntry({
    formId: "village-tasks-form",
    inputId: "village-task-score",
    scoreListId: "village-task-score-list",
    subtotalId: "village-subtotal",
    totalId: "village-total",
    pointsInputId: "village_tasks",
    chipClass: "score-chip--village",
    multiplier: 1
});

initialiseTaskEntry({
    formId: "rail-tasks-form",
    inputId: "rail-task-score",
    scoreListId: "rail-task-score-list",
    subtotalId: "rail-subtotal",
    totalId: "rail-total",
    pointsInputId: "rail_tasks",
    chipClass: "score-chip--railway",
    multiplier: 1
});

initialiseTaskEntry({
    formId: "river-tasks-form",
    inputId: "river-task-score",
    scoreListId: "river-task-score-list",
    subtotalId: "river-subtotal",
    totalId: "river-total",
    pointsInputId: "river_tasks",
    chipClass: "score-chip--river",
    multiplier: 1
});


}
