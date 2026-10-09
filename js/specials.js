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

function initialiseCountEntry(config) {
    const input = document.getElementById(config.inputId);

    if (!input) {
        return;
    }

    const totalDisplay = document.getElementById(config.totalId);
    const pointsInput = document.getElementById(config.pointsInputId);

    function updateScore() {
        const count = Number(input.value);
        const points = input.validity.valid && Number.isInteger(count) && count >= 0
            ? count * config.multiplier
            : 0;

        totalDisplay.textContent = points;
        pointsInput.value = points;
        calculateScore();
    }

    input.addEventListener("input", updateScore);
    updateScore();
}

function initialiseHearts() {
    const inputs = [
        document.getElementById("heart-1-score"),
        document.getElementById("heart-2-score"),
        document.getElementById("heart-3-score")
    ];

    if (!inputs[0]) {
        return;
    }

    const totalDisplay = document.getElementById("hearts-total");
    const pointsInput = document.getElementById("heart_points");

    function updateScore() {
        const total = inputs.reduce(function (sum, input) {
            const score = Number(input.value);
            const validScore = input.validity.valid && Number.isInteger(score)
                && score >= 0 && score <= 6;

            return sum + (validScore ? score : 0);
        }, 0);

        totalDisplay.textContent = total;
        pointsInput.value = total;
        calculateScore();
    }

    inputs.forEach(function (input) {
        input.addEventListener("input", updateScore);
    });
    updateScore();
}

export function initialiseSpecials() {
    initialiseHearts();

    initialiseCountEntry({
        inputId: "signalman-count",
        totalId: "signalman-total",
        pointsInputId: "signalman_points",
        multiplier: 2
    });

    initialiseCountEntry({
        inputId: "shepherdess-count",
        totalId: "shepherdess-total",
        pointsInputId: "shepherdess_points",
        multiplier: 2
    });

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
