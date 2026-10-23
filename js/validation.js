export function isValidScore(value, min = 0, max = Number.MAX_SAFE_INTEGER) {
    return typeof value === "number" && Number.isSafeInteger(value) && value >= min && value <= max;
}

export function readScoreInput(input, { allowEmpty = true } = {}) {
    if (input.validity?.badInput) return null;
    if (String(input.value).trim() === "") return allowEmpty ? 0 : null;

    const multiplier = Number(input.dataset?.scoreMultiplier || 1);
    const min = input.min === undefined || input.min === "" ? 0 : Number(input.min);
    const max = input.max === undefined || input.max === "" ? Number.MAX_SAFE_INTEGER : Number(input.max);
    const safeMax = Math.min(max, Math.floor(Number.MAX_SAFE_INTEGER / multiplier));
    const value = Number(input.value);
    return isValidScore(value, min, safeMax) ? value : null;
}

export function scoreInputMessage(input) {
    const min = input.min || "0";
    return input.max
        ? `Enter a whole number from ${min} to ${input.max}.`
        : `Enter a whole number of ${min} or more, within the supported scoring range.`;
}

export function reportScoreError(message, input) {
    const notice = document.getElementById("score-validation-message");
    if (notice) {
        notice.textContent = message;
        notice.hidden = false;
    }
    if (input) {
        input.setAttribute("aria-invalid", "true");
        input.focus();
        input.setCustomValidity(message);
        input.reportValidity();
        input.setCustomValidity("");
    }
}

export function clearScoreError() {
    const notice = document.getElementById("score-validation-message");
    if (notice) {
        notice.textContent = "";
        notice.hidden = true;
    }
}

export function initialiseScoreValidation() {
    document.querySelectorAll(".score-grid input:not([type='hidden'])").forEach(input => {
        if (input.type !== "number") return;
        input.addEventListener("input", () => {
            const valid = readScoreInput(input) !== null;
            input.setAttribute("aria-invalid", String(!valid));
            if (valid) clearScoreError();
        });
    });
}
