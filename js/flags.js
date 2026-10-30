import { calculateScore } from "./scoring.js?v=4e224e0d154c";
import { readScoreInput } from "./validation.js?v=4e224e0d154c";

export function initialiseFlags() {
    ["forest", "grain", "village"].forEach(function (kind) {
        const inputs = [1, 2, 3].map(function (number) {
            return document.getElementById(`flag-${kind}-${number}`);
        });

        if (!inputs[0]) {
            return;
        }

        const pointsInput = document.getElementById(`flag_${kind}`);
        const totalDisplay = document.getElementById(`flag-${kind}-total`);

        function updateScore() {
            const total = inputs.reduce(function (sum, input) {
                return sum + (readScoreInput(input) ?? 0);
            }, 0);

            pointsInput.value = total;
            totalDisplay.textContent = total;
            calculateScore();
        }

        inputs.forEach(function (input) {
            input.addEventListener("input", updateScore);
        });
        updateScore();
    });
}
