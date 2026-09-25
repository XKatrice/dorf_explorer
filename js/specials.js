import { calculateScore } from "./scoring.js";

const harvestScores = [];


function calculateDoubledTasks(scores) {
    const taskTotal = scores.reduce(function (total, score) {
        return total + score;
    }, 0);

    return taskTotal * 2;
}


function renderHarvestScores() {
    const scoreList = document.getElementById("harvest-score-list");

    scoreList.innerHTML = "";

    harvestScores.forEach(function (score, index) {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "score-chip score-chip--field";
        button.textContent = score;

        button.setAttribute(
            "aria-label",
            `Remove task worth ${score} points`
        );

        button.addEventListener("click", function () {
            harvestScores.splice(index, 1);
            updateHarvestScore();
        });

        scoreList.appendChild(button);
    });
}


function updateHarvestScore() {
    const subtotal = harvestScores.reduce(function (total, score) {
        return total + score;
    }, 0);

    const doubledTotal = calculateDoubledTasks(harvestScores);

    document.getElementById("harvest-subtotal").textContent = subtotal;
    document.getElementById("harvest-total").textContent = doubledTotal;
    document.getElementById("harvest_points").value = doubledTotal;

    renderHarvestScores();
    calculateScore();
}


function addHarvestScore(harvestInput) {
    const score = Number(harvestInput.value);

    if (score <= 0) {
        return;
    }

    harvestScores.push(score);

    harvestInput.value = "";
    harvestInput.focus();

    updateHarvestScore();
}


export function initialiseHarvest() {
    const harvestForm = document.getElementById("harvest-form");
    const harvestInput = document.getElementById("harvest-task-score");

    if (!harvestForm || !harvestInput) {
        return;
    }

    harvestForm.addEventListener("submit", function (event) {
        event.preventDefault();
        addHarvestScore(harvestInput);
    });
}