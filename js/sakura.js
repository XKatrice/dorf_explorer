import { isValidScore, readScoreInput } from "./validation.js?v=9a57946151f7";
import { initialiseCardNavigation } from "./card-navigation.js?v=9a57946151f7";
import { createSakuraMap } from "./sakura-map.js?v=9a57946151f7";
import {
    boxes, campaignProgress, cardAchievements, movementForScore, nextRouteMoves, routeAchievements,
    sakuraMoveCost, scorecardUnlocks, scoreGame, scoreGroups, scoreUnlocks
} from "./sakura-rules.js?v=9a57946151f7";

const storageKey = "dorfExplorerSakura";
const form = document.getElementById("sakura-score-form");
const fields = document.getElementById("sakura-score-fields");
const save = document.getElementById("sakura-save");
const cancel = document.getElementById("sakura-cancel");
const status = document.getElementById("sakura-status");
const inputs = new Map();
let editingId = null;
let updateMap;

function element(tag, text) {
    const node = document.createElement(tag);
    node.textContent = text;
    return node;
}

function action(text, handler) {
    const button = element("button", text);
    button.type = "button";
    button.addEventListener("click", () => attempt(handler));
    return button;
}

function attempt(task) {
    status.hidden = true;
    try {
        task();
    } catch (error) {
        status.textContent = error.message;
        status.hidden = false;
    }
}

function readCampaign() {
    const raw = localStorage.getItem(storageKey);
    if (raw === null) return { games: [], moves: [], achievements: [] };
    try {
        const campaign = JSON.parse(raw);
        if ([campaign.games, campaign.moves, campaign.achievements].every(Array.isArray)
            && campaign.games.every(game => isValidScore(game.total, 1) && game.entries)
            && campaign.moves.every(move => typeof move.space === "string")) return campaign;
    } catch {
        // Leave damaged records in storage so they can still be recovered.
    }
    throw new Error("Sakura campaign data could not be read. Existing data is still in browser storage.");
}

function writeCampaign(campaign) {
    localStorage.setItem(storageKey, JSON.stringify(campaign));
}

const cards = new Map();
const scoreSections = [];
const taskEntries = new Map();
const wraparoundIcon = "wraparound";
const taskStyles = {
    cherry: ["Cherry Tree Tasks", "forest", "cherry"],
    rice: ["Rice Tasks", "rice_paddy", "rice"],
    village: ["Village Tasks", "village", "village"],
    road: ["Road Tasks", "road", "road"],
    river: ["River Tasks", "river", "river"],
    wraparound: ["Wraparound Tasks", wraparoundIcon, "wraparound"],
    double: ["Double Tasks", wraparoundIcon, "double"]
};
const scoringIcons = {
    pinkFlag: ["flag"],
    greenFlag: ["flag"],
    redFlag: ["flag"],
    longRoad: ["road"],
    longRiver: ["river"],
    wraparoundBonus: ["road", wraparoundIcon, "river"],
    temples: ["temple"],
    springs: ["springs"],
    springsTasks: ["springs", wraparoundIcon]
};
let unlockedScores = new Set();
let scoreBlossoms = false;

function createCard(grid, id, title, iconNames = []) {
    const card = document.createElement("div");
    card.className = "score-item special-tile sakura-score-card";
    if (iconNames.length) {
        const icons = document.createElement("div");
        icons.className = "sakura-score-icons";
        icons.dataset.score = id;
        for (const iconName of iconNames) {
            const icon = document.createElement("img");
            icon.src = `assets/sakura_${iconName}.png`;
            icon.alt = "";
            icons.append(icon);
        }
        card.append(icons);
    }
    card.append(element("h3", title));
    grid.append(card);
    cards.set(id, card);
    return card;
}

function numberInput(id, min, multiplier) {
    const input = document.createElement("input");
    input.id = `sakura-${id}`;
    input.type = "number";
    input.min = String(min);
    input.step = "1";
    input.inputMode = "numeric";
    input.placeholder = "0";
    input.dataset.scoreMultiplier = multiplier;
    return input;
}

function labelledInput(id, name, min, multiplier) {
    const input = numberInput(id, min, multiplier);
    const label = element("label", name);
    label.htmlFor = input.id;
    return [label, input];
}

function addField(card, id, name, multiplier = 1) {
    const entry = document.createElement("div");
    entry.className = "sakura-number-entry";
    const [label, input] = labelledInput(id, name, 0, multiplier);
    inputs.set(id, input);
    entry.append(label, input);
    card.append(entry);
}

function addTaskCard(grid, id, multiplier) {
    const [title, icon, color] = taskStyles[id];
    const card = createCard(grid, id, title, [icon]);
    const entry = document.createElement("div");
    entry.className = "special-entry";
    const [label, input] = labelledInput(id, id === "double" ? "Task count" : "Task score", 1, multiplier);
    const controls = document.createElement("div");
    controls.className = "special-entry-controls";
    const list = document.createElement("div");
    list.className = "entered-scores";
    list.setAttribute("aria-live", "polite");
    const subtotal = element("output", "0");
    subtotal.className = "special-calculation";
    const task = { input, scores: [], list, subtotal, multiplier, color };
    taskEntries.set(id, task);

    function add() {
        const score = readScoreInput(input, { allowEmpty: false });
        if (score === null) {
            input.focus();
            throw new Error(`Enter a positive whole number for ${title}.`);
        }
        if (!isValidScore((taskCount(task) + score) * multiplier)) {
            input.focus();
            throw new Error("This task subtotal is too large. Enter a smaller number.");
        }
        task.scores.push(score);
        input.value = "";
        input.focus();
        renderTask(task);
        previewScore();
    }
    controls.append(input, action("Add", add));
    input.addEventListener("keydown", event => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        attempt(add);
    });
    entry.append(label, controls);
    card.append(entry, list, subtotal);
}

function taskCount(task) {
    return task.scores.reduce((total, score) => total + score, 0);
}

function renderTask(task) {
    task.list.replaceChildren();
    task.scores.forEach((score, index) => {
        const points = score * task.multiplier;
        const chip = action(String(points), () => {
            task.scores.splice(index, 1);
            renderTask(task);
            previewScore();
            (task.list.children[index] || task.list.lastElementChild || task.input).focus();
        });
        chip.className = `score-chip score-chip--sakura-${task.color}`;
        chip.setAttribute("aria-label", `Remove task entry worth ${points} points`);
        task.list.append(chip);
    });
    task.subtotal.textContent = `Subtotal: ${taskCount(task) * task.multiplier} points`;
}

for (const [name, groupFields] of scoreGroups) {
    const section = document.createElement("section");
    const heading = element("h3", name);
    const grid = document.createElement("div");
    grid.className = "score-grid";
    section.append(heading, grid);
    fields.append(section);
    scoreSections.push(section);
    for (const [id, label, multiplier = 1] of groupFields) {
        if (taskStyles[id]) addTaskCard(grid, id, multiplier);
        else addField(createCard(grid, id, label, scoringIcons[id]), id, multiplier === 1 ? "Count" : `Count (×${multiplier})`, multiplier);
    }
}
const blossomCard = createCard(scoreSections.at(-1).querySelector(".score-grid"), "blossoms", "Cherry Blossoms");
addField(blossomCard, "blossoms", "Collected this game");
addField(blossomCard, "blossomsForCards", "Spent on achievement cards");
const blossomPoints = element("output", "");
blossomPoints.className = "special-calculation";
blossomCard.append(blossomPoints);

function updateScorecardUnlocks(campaign, progress, game) {
    unlockedScores = scorecardUnlocks(progress.reached, campaign.achievements, game);
    scoreBlossoms = game ? Boolean(game.scoreBlossoms) : progress.reached.has("Cherry blossoms");
    for (const [id, card] of cards) {
        card.hidden = Object.hasOwn(scoreUnlocks, id) && !unlockedScores.has(id);
    }
    for (const section of scoreSections) {
        section.hidden = !section.querySelector(".score-item:not([hidden])");
    }
    initialiseCardNavigation(fields, document.getElementById("sakura-scoreboard"));
}

function readScorecard() {
    const entries = {};
    const tasks = {};
    for (const [id, input] of inputs) {
        entries[id] = input.closest(".score-item").hidden ? 0 : readScoreInput(input);
    }
    for (const [id, task] of taskEntries) {
        tasks[id] = cards.get(id).hidden ? [] : [...task.scores];
        entries[id] = cards.get(id).hidden ? 0 : taskCount(task);
    }
    const total = scoreGame(entries, scoreBlossoms);
    return { entries, tasks, total, scoreBlossoms, unlockedScores: [...unlockedScores] };
}

function previewScore() {
    const { entries, total } = readScorecard();
    document.getElementById("sakura-total").textContent =
        Object.values(entries).every(value => value !== null) && isValidScore(total) ? total : "—";
    blossomPoints.hidden = !scoreBlossoms;
    blossomPoints.textContent = `Subtotal: ${Math.min(entries.blossoms || 0, 50)} points`;
}

function showScorecard(game, campaign, progress) {
    editingId = game?.id ?? null;
    for (const [id, input] of inputs) input.value = game?.entries[id] || "";
    for (const [id, task] of taskEntries) {
        const savedTotal = game?.entries[id];
        task.scores = [...(game?.tasks?.[id] ?? (savedTotal > 0 ? [savedTotal] : []))];
        task.input.value = "";
        renderTask(task);
    }
    updateScorecardUnlocks(campaign, progress, game);
    save.textContent = game ? "Save changes" : "Save game";
    cancel.hidden = !game;
    previewScore();
}
form.addEventListener("input", previewScore);
form.addEventListener("submit", event => {
    event.preventDefault();
    attempt(() => {
        const campaign = readCampaign();
        const index = campaign.games.findIndex(game => game.id === editingId);
        if (editingId && index === -1) throw new Error("This saved game could not be found.");
        updateScorecardUnlocks(campaign, campaignProgress(campaign.games, campaign.moves), campaign.games[index]);
        previewScore();
        const score = readScorecard();
        if (Object.values(score.entries).some(value => value === null) || !isValidScore(score.total, 1)) {
            throw new Error("Enter whole numbers and a game total of at least one point.");
        }
        const game = index === -1
            ? { id: crypto.randomUUID(), savedAt: new Date().toISOString(), ...score }
            : { ...campaign.games[index], ...score };
        const spentBlossoms = campaign.moves.filter(move => move.currency === "blossoms" && move.gameId === game.id)
            .reduce((total, move) => total + move.cost, score.entries.blossomsForCards);
        if (spentBlossoms > score.entries.blossoms) {
            throw new Error("Cherry blossoms spent on paths and cards exceed the amount collected in this game.");
        }
        if (index === -1) campaign.games.push(game);
        else campaign.games[index] = game;
        if (campaignProgress(campaign.games, campaign.moves).movement < 0) {
            throw new Error("This change would leave too few movement points for your campaign progress. Undo moves before saving.");
        }
        writeCampaign(campaign);
        showScorecard(null, campaign, campaignProgress(campaign.games, campaign.moves));
        window.location.hash = index === -1 ? "campaign" : "history";
    });
});

cancel.addEventListener("click", () => attempt(() => {
    const campaign = readCampaign();
    showScorecard(null, campaign, campaignProgress(campaign.games, campaign.moves));
    window.location.hash = "history";
}));

function renderHistory(campaign, progress) {
    const history = document.getElementById("sakura-history");
    history.replaceChildren();
    if (!campaign.games.length) history.append(element("li", "No Sakura games saved yet."));
    for (const game of [...campaign.games].reverse()) {
        const date = new Date(game.savedAt).toLocaleDateString();
        const item = element("li", `${date} · ${game.total} points · ${movementForScore(game.total)} movement`);
        item.append(action("Edit", () => {
            showScorecard(game, campaign, progress);
            window.location.hash = "scorecard";
        }));
        history.append(item);
    }
}

function advance(route, space) {
    const campaign = readCampaign();
    const progress = campaignProgress(campaign.games, campaign.moves);
    const cost = sakuraMoveCost(space);
    if (progress[route.currency] < cost || !nextRouteMoves(route, progress).includes(space)) {
        throw new Error("That space is no longer available. Choose a path beside your campaign progress.");
    }
    campaign.moves.push({ space, cost, currency: route.currency, gameId: progress.latestGame?.id });
    writeCampaign(campaign);
    render();
}

function renderCampaign(campaign, progress) {
    document.getElementById("sakura-balances").textContent =
        `${progress.movement} movement points available · ${progress.blossoms} cherry blossoms left from your latest game`;
    const refunded = campaign.moves.filter(move => move.currency === "movement" && boxes.has(move.space)).length;
    const refundNotice = document.getElementById("sakura-box-refund");
    refundNotice.hidden = refunded === 0;
    refundNotice.textContent = `${refunded} movement ${refunded === 1 ? "point" : "points"} previously spent opening boxes automatically returned to your balance.`;
    document.getElementById("sakura-undo").disabled = !campaign.moves.some(move => !boxes.has(move.space));
    const map = document.getElementById("sakura-map");
    if (!updateMap) {
        updateMap = createSakuraMap(map, (route, space) => attempt(() => advance(route, space)));
        const recentSpace = campaign.moves.at(-1)?.space ?? "Start";
        const marker = map.querySelector(`[data-space="${CSS.escape(recentSpace)}"]`);
        if (marker) {
            const bounds = marker.getBoundingClientRect();
            const viewport = map.getBoundingClientRect();
            map.scrollTo(bounds.left - viewport.left - map.clientWidth / 2,
                bounds.top - viewport.top - map.clientHeight / 2);
        }
    }
    updateMap(progress);
    const achievements = document.getElementById("sakura-achievements");
    achievements.replaceChildren();
    for (const name of [...routeAchievements, ...cardAchievements].sort()) {
        const label = element("label", name);
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.disabled = routeAchievements.includes(name);
        checkbox.checked = progress.reached.has(name) || campaign.achievements.includes(name);
        checkbox.addEventListener("change", () => {
            const checked = checkbox.checked;
            checkbox.checked = !checked;
            attempt(() => {
                const current = readCampaign();
                const achievements = new Set(current.achievements);
                if (checked) achievements.add(name);
                else achievements.delete(name);
                writeCampaign({ ...current, achievements: [...achievements] });
                checkbox.checked = checked;
            });
        });
        label.prepend(checkbox);
        achievements.append(label);
    }
}

document.getElementById("sakura-undo").addEventListener("click", () => attempt(() => {
    const campaign = readCampaign();
    while (boxes.has(campaign.moves.at(-1)?.space)) campaign.moves.pop();
    if (!campaign.moves.length) return;
    campaign.moves.pop();
    writeCampaign(campaign);
    render();
}));

function render() {
    const view = ["history", "campaign"].includes(window.location.hash.slice(1))
        ? window.location.hash.slice(1) : "scorecard";
    for (const panel of document.querySelectorAll(".sakura-panel")) panel.hidden = panel.id !== view;
    for (const link of document.querySelectorAll(".sakura-navigation a[href^='#']")) {
        if (link.hash === `#${view}`) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
    }
    const campaign = readCampaign();
    const progress = campaignProgress(campaign.games, campaign.moves);
    if (view === "history") renderHistory(campaign, progress);
    if (view === "campaign") renderCampaign(campaign, progress);
    if (view === "scorecard") {
        updateScorecardUnlocks(campaign, progress, campaign.games.find(game => game.id === editingId));
        previewScore();
    }
}

window.addEventListener("hashchange", () => attempt(render));
window.addEventListener("storage", event => {
    if (event.key === storageKey || event.key === null) attempt(render);
});
attempt(() => {
    const campaign = readCampaign();
    showScorecard(null, campaign, campaignProgress(campaign.games, campaign.moves));
    save.disabled = false;
    render();
});
