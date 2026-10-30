import { readGames, writeStoredJSON, storageFailure } from "./data-store.js?v=4e224e0d154c";
import { CAMPAIGN_KEY, readCampaignState, addManualAchievement, updateManualAchievement } from "./campaign-model.js?v=4e224e0d154c";
import { ensureCampaignStarted, assertCampaignEditable } from "./campaign-files.js?v=4e224e0d154c";
import { readScoreInput } from "./validation.js?v=4e224e0d154c";

export function initialiseManualAchievements() {
    const root = document.getElementById("manual-achievements");
    if (!root) return;
    const message = document.createElement("p");
    message.setAttribute("role", "status");
    const list = document.createElement("div");
    list.className = "manual-check-list";
    const form = document.createElement("form");
    form.className = "manual-check-form";
    function field(labelText, tag, attributes) {
        const label = document.createElement("label");
        label.textContent = labelText;
        const input = document.createElement(tag);
        Object.assign(input, attributes);
        label.appendChild(input);
        form.appendChild(label);
        return input;
    }
    const name = field("Achievement name", "input", { type: "text", required: true, maxLength: 80, placeholder: "e.g. Three matching flags" });
    const criteria = field("Conditions printed on the card", "textarea", { required: true, maxLength: 1000, rows: 3, placeholder: "Include any territory, flag or layout conditions." });
    const target = field("Target score (optional)", "input", { type: "number", min: "1", step: "1", placeholder: "0", inputMode: "numeric" });
    const add = document.createElement("button");
    add.type = "submit";
    add.textContent = "Add manual achievement";
    form.appendChild(add);
    root.append(list, form, message);

    let campaignId;
    function showError(error) {
        message.textContent = ["StorageError", "QuotaExceededError", "SecurityError"].includes(error?.name)
            ? storageFailure(error).message : error.message || "The achievement could not be saved.";
    }
    function persist(next) {
        assertCampaignEditable(localStorage, campaignId);
        writeStoredJSON(localStorage, CAMPAIGN_KEY, next);
        render();
        window.dispatchEvent(new CustomEvent("campaign-updated", { detail: { source: "manual" } }));
    }
    function change(id, changes) {
        try {
            const state = assertCampaignEditable(localStorage, campaignId);
            persist(updateManualAchievement(state, id, changes));
            message.textContent = "Manual achievement saved.";
            return true;
        } catch (error) { showError(error); return false; }
    }
    function render() {
        const state = readCampaignState(localStorage);
        const stale = state.id !== campaignId;
        const locked = stale || Boolean(state.completedAt);
        list.replaceChildren();
        for (const item of state.manualAchievements || []) {
            const card = document.createElement("article");
            card.className = "manual-check-card";
            const heading = document.createElement("h3");
            heading.textContent = item.name;
            const condition = document.createElement("p");
            condition.textContent = item.criteria;
            card.append(heading, condition);
            if (item.target !== null) {
                const progress = document.createElement("p");
                progress.textContent = `Recorded score: ${item.recordedScore} / ${item.target}. ${item.recordedScore < item.target
                    ? `${item.target - item.recordedScore} points to the target.`
                    : "Target score reached; check all other conditions on the board."}`;
                const label = document.createElement("label");
                label.textContent = "Score checked on the board";
                const score = document.createElement("input");
                Object.assign(score, { type: "number", min: "0", step: "1", placeholder: "0", inputMode: "numeric", disabled: locked });
                score.value = item.recordedScore ? String(item.recordedScore) : "";
                score.addEventListener("change", () => {
                    const value = readScoreInput(score);
                    if (value === null) {
                        score.setAttribute("aria-invalid", "true");
                        message.textContent = "Enter a whole-number score of 0 or more.";
                        return;
                    }
                    change(item.id, { recordedScore: value });
                });
                label.appendChild(score);
                card.append(progress, label);
            }
            const confirmation = document.createElement("label");
            confirmation.className = "manual-check-confirmation";
            const checkbox = document.createElement("input");
            Object.assign(checkbox, { type: "checkbox", checked: Boolean(item.completedAt), disabled: locked });
            checkbox.addEventListener("change", () => {
                if (!change(item.id, { completed: checkbox.checked })) checkbox.checked = Boolean(item.completedAt);
            });
            confirmation.append(checkbox, document.createTextNode("I checked the board and met all the card's conditions"));
            const date = document.createElement("p");
            date.textContent = item.completedAt ? `Completed ${new Date(item.completedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" })}` : "Awaiting your confirmation";
            const remove = document.createElement("button");
            remove.type = "button";
            remove.className = "delete-game-button";
            remove.textContent = "Remove achievement";
            remove.disabled = locked;
            remove.addEventListener("click", () => {
                if (!window.confirm(`Remove ${item.name} and its recorded completion date?`)) return;
                try {
                    const current = assertCampaignEditable(localStorage, campaignId);
                    persist({ ...current, manualAchievements: current.manualAchievements.filter(entry => entry.id !== item.id) });
                    message.textContent = "Manual achievement removed.";
                } catch (error) { showError(error); }
            });
            card.append(confirmation, date, remove);
            list.appendChild(card);
        }
        if (!list.children.length) list.textContent = "Add any achievement whose conditions need to be checked on the board.";
        form.querySelectorAll("input, textarea, button").forEach(input => { input.disabled = locked; });
        if (stale) message.textContent = "The active campaign changed. Reload this scorecard before updating achievements.";
        else if (state.completedAt) message.textContent = "Reopen this campaign to update manual achievements.";
    }
    form.addEventListener("submit", event => {
        event.preventDefault();
        try {
            const value = target.value.trim() === "" ? null : readScoreInput(target, { allowEmpty: false });
            if (target.value.trim() !== "" && value === null) throw new Error("Enter a positive whole-number target, or leave it blank.");
            const state = assertCampaignEditable(localStorage, campaignId);
            persist(addManualAchievement(state, name.value, criteria.value, value));
            form.reset();
            message.textContent = "Manual achievement added.";
        } catch (error) { showError(error); }
    });
    try {
        campaignId = ensureCampaignStarted(localStorage, readGames(localStorage)).id;
        render();
    } catch (error) { form.hidden = true; showError(error); }
    function refresh(event) {
        if (event.type === "storage" && event.key !== CAMPAIGN_KEY && event.key !== null) return;
        try {
            if (!document.getElementById("save-game")) campaignId = readCampaignState(localStorage).id;
            render();
        } catch (error) { showError(error); }
    }
    window.addEventListener("storage", refresh);
    window.addEventListener("campaign-updated", refresh);
}
