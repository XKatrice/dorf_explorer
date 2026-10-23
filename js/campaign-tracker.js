import { readGames, readStoredJSON, writeStoredJSON } from "./data-store.js?v=0f4147c0c5d0";
import { loadGameRankings } from "./rankings.js?v=0f4147c0c5d0";
import { ARCHIVE_KEY, ensureCampaignStarted, assertCampaignAssociation, assertCampaignEditable, buildCampaignFile, startNewCampaign, downloadCampaignFile, parseCampaignFile, importCampaignFile } from "./campaign-files.js?v=0f4147c0c5d0";
import {
    CAMPAIGN_KEY, CAMPAIGN_NODES, CAMPAIGN_PATHS, readCampaignState,
    movementEarned, campaignProgress, campaignAchievements, spendMovement, pathLength, stepId
} from "./campaign-model.js?v=0f4147c0c5d0";

const SVG_NS = "http://www.w3.org/2000/svg";
const nodeById = new Map(CAMPAIGN_NODES.map(node => [node.id, node]));

function routeGeometry(path) {
    const from = nodeById.get(path.from), to = nodeById.get(path.to);
    const dx = to.x - from.x, dy = to.y - from.y;
    const edge = 1 / Math.sqrt((dx / 78) ** 2 + (dy / 48) ** 2);
    const start = { x: from.x + dx * edge, y: from.y + dy * edge };
    const end = { x: to.x - dx * edge, y: to.y - dy * edge };
    const control = { x: (start.x + end.x) / 2 + (path.bend || 0) * 2, y: (start.y + end.y) / 2 };
    const point = t => ({
        x: (1 - t) ** 2 * start.x + 2 * (1 - t) * t * control.x + t ** 2 * end.x,
        y: (1 - t) ** 2 * start.y + 2 * (1 - t) * t * control.y + t ** 2 * end.y
    });
    const samples = [{ ...start, distance: 0 }];
    for (let i = 1; i <= 200; i++) {
        const next = point(i / 200), previous = samples.at(-1);
        samples.push({ ...next, distance: previous.distance + Math.hypot(next.x - previous.x, next.y - previous.y) });
    }
    return {
        d: `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`,
        pointAt(fraction) {
            const distance = fraction * samples.at(-1).distance;
            return samples.find(sample => sample.distance >= distance) || samples.at(-1);
        }
    };
}

function svgElement(tag, attributes = {}, text) {
    const element = document.createElementNS(SVG_NS, tag);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
    if (text !== undefined) element.textContent = text;
    return element;
}

export async function initialiseCampaignTracker() {
    const root = document.getElementById("campaign-tracker");
    if (!root) return;
    const status = document.getElementById("campaign-status");
    const notice = document.getElementById("campaign-notice");
    try {
        const rankings = await loadGameRankings();
        let state = ensureCampaignStarted(localStorage, readGames(localStorage));
        let earned = 0;
        const players = document.getElementById("campaign-players");
        players.value = state.players;

        function persist(nextState) {
            const unlocked = new Set(campaignAchievements(nextState).filter(item => item.unlocked).map(item => item.id));
            nextState = { ...nextState, unlockDates: Object.fromEntries(
                Object.entries(nextState.unlockDates || {}).filter(([id]) => unlocked.has(id))
            ) };
            // Commit to memory only after the browser has accepted the write.
            assertCampaignAssociation(localStorage, nextState.id);
            writeStoredJSON(localStorage, CAMPAIGN_KEY, nextState);
            state = nextState;
        }

        function error(message) {
            status.textContent = message;
        }

        function advance(id) {
            try {
                const before = campaignProgress(state, earned);
                // Re-read both records to avoid spending from a stale tab balance.
                state = readCampaignState(localStorage);
                assertCampaignEditable(localStorage, state.id);
                earned = movementEarned(readGames(localStorage, state.id), rankings);
                persist(spendMovement(state, id, earned));
                const after = campaignProgress(state, earned);
                const rewards = after.unlocked.filter(node => !before.reached.has(node.id)).map(node => node.name);
                if (after.hearts > before.hearts) rewards.push("Red Heart");
                render();
                status.textContent = rewards.length
                    ? `Unlocked: ${rewards.join(", ")}! ${Math.max(0, after.balance)} movement points available.`
                    : `1 movement point spent. ${Math.max(0, after.balance)} available.`;
            } catch (problem) {
                render();
                error(problem.message);
            }
        }

        function renderMap(progress) {
            const map = document.getElementById("campaign-map");
            map.replaceChildren();
            const svg = svgElement("svg", { viewBox: "0 0 900 1410", "aria-label": "Campaign advancement tree. Start at the bottom. Choose a highlighted circle to spend one point." });
            const curves = svgElement("g", { "aria-hidden": "true" });
            const circles = svgElement("g");
            const nodes = svgElement("g", { "aria-hidden": "true" });

            CAMPAIGN_PATHS.forEach(path => {
                const from = nodeById.get(path.from), to = nodeById.get(path.to);
                const count = pathLength(path, state);
                const route = routeGeometry(path);
                curves.appendChild(svgElement("path", {
                    d: route.d,
                    class: "campaign-route"
                }));
                for (let index = 1; index <= count; index++) {
                    const { x, y } = route.pointAt(index / (count + 1));
                    const id = stepId(path, index);
                    const filled = state.moves.includes(id);
                    const available = progress.availableSteps.has(id);
                    const canSpend = available && progress.balance > 0 && !state.completedAt;
                    const isHeart = path.heart && index === Math.min(path.heart, count);
                    const group = svgElement("g", {
                        class: `campaign-step${filled ? " is-filled" : ""}${available ? " is-available" : ""}`,
                        role: "button", tabindex: canSpend ? "0" : "-1", "aria-disabled": String(!canSpend),
                        "aria-label": `${from.name} to ${to.name}, circle ${index} of ${count}${isHeart ? ", unlocks a Red Heart" : ""}: ${filled ? "spent" : canSpend ? "spend 1 movement point" : "unavailable"}`,
                        "data-step": id
                    });
                    group.appendChild(svgElement("circle", { cx: x, cy: y, r: 19, class: "campaign-step-hit" }));
                    group.appendChild(svgElement("circle", { cx: x, cy: y, r: 8 }));
                    if (isHeart) group.appendChild(svgElement("text", { x, y: y + 5, class: "campaign-heart", "aria-hidden": "true" }, "♥"));
                    const activate = () => {
                        if (!canSpend) return;
                        advance(id);
                        document.querySelector('.campaign-step.is-available[aria-disabled="false"]')?.focus();
                    };
                    group.addEventListener("click", activate);
                    group.addEventListener("keydown", event => {
                        if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            activate();
                        }
                    });
                    circles.appendChild(group);
                }
            });

            CAMPAIGN_NODES.forEach(node => {
                const reached = progress.reached.has(node.id);
                const group = svgElement("g", { class: `campaign-hex${reached ? " is-unlocked" : ""}` });
                const points = [[-76, 0], [-54, -45], [54, -45], [76, 0], [54, 45], [-54, 45]]
                    .map(([x, y]) => `${node.x + x},${node.y + y}`).join(" ");
                group.appendChild(svgElement("polygon", { points }));
                group.appendChild(svgElement("text", { x: node.x, y: node.y - 21, class: "campaign-node-kind" },
                    node.kind === "start" ? "BEGIN HERE" : node.kind === "box" ? "BOX" : "ACHIEVEMENT CARD"));
                group.appendChild(svgElement("text", { x: node.x, y: node.y + 3, class: "campaign-node-name" }, node.name));
                group.appendChild(svgElement("text", { x: node.x, y: node.y + 26, class: "campaign-node-state" }, reached ? "✓ Reached" : "Locked"));
                nodes.appendChild(group);
            });
            svg.append(curves, circles, nodes);
            map.appendChild(svg);
        }

        function renderChoices(progress) {
            const choices = document.getElementById("campaign-choices");
            choices.replaceChildren();
            CAMPAIGN_PATHS.forEach(path => {
                const candidates = [...progress.availableSteps].filter(id => id.startsWith(path.id + ":"));
                if (!candidates.length) return;
                const button = document.createElement("button");
                const from = nodeById.get(path.from), to = nodeById.get(path.to);
                const destination = progress.reached.has(path.from) ? to : from;
                const spent = state.moves.filter(id => id.startsWith(path.id + ":")).length;
                button.type = "button";
                button.className = "campaign-choice";
                button.textContent = `Toward ${destination.name} · ${spent}/${pathLength(path, state)} circles`;
                button.setAttribute("aria-label", `${button.textContent}. Spend 1 movement point`);
                button.disabled = progress.balance <= 0 || Boolean(state.completedAt);
                button.addEventListener("click", () => {
                    advance(candidates[0]);
                    document.querySelector(".campaign-choice:not(:disabled)")?.focus();
                });
                choices.appendChild(button);
            });
            if (!choices.children.length) choices.textContent = "All paths completed!";
        }

        function render() {
            earned = movementEarned(readGames(localStorage, state.id), rankings);
            const progress = campaignProgress(state, earned);
            const file = buildCampaignFile(state, readGames(localStorage, state.id), rankings);
            const formatDate = date => date ? new Date(date).toLocaleDateString("en-GB", {
                day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London"
            }) : "In progress";
            document.getElementById("campaign-started").textContent = formatDate(state.startedAt);
            document.getElementById("campaign-completed").textContent = formatDate(state.completedAt);
            document.getElementById("campaign-game-count").textContent = file.campaign.totalGames;
            document.getElementById("campaign-total-score").textContent = file.campaign.totalScore;
            document.getElementById("campaign-high-score").textContent = file.campaign.highestScoringGame?.score ?? "No games yet";
            document.getElementById("complete-campaign").textContent = state.completedAt ? "Reopen campaign" : "Mark campaign complete";
            const archives = document.getElementById("campaign-archives");
            archives.replaceChildren();
            const archiveStatus = document.getElementById("archive-status");
            archiveStatus.textContent = "";
            let savedArchives = [];
            try { savedArchives = readStoredJSON(localStorage, ARCHIVE_KEY, []); }
            catch (problem) { archiveStatus.textContent = problem.message; }
            savedArchives.slice().reverse().forEach(archive => {
                const item = document.createElement("li");
                const button = document.createElement("button");
                button.type = "button";
                button.textContent = `${formatDate(archive.campaign.startedAt)} · ${archive.campaign.playerNames || "Unnamed campaign"} · ${archive.campaign.totalGames} games — Download`;
                button.addEventListener("click", () => downloadCampaignFile(archive));
                item.appendChild(button);
                archives.appendChild(item);
            });
            if (!savedArchives.length && !archiveStatus.textContent) archives.textContent = "No archived campaigns yet.";
            document.getElementById("movement-available").textContent = Math.max(0, progress.balance);
            document.getElementById("movement-earned").textContent = earned;
            document.getElementById("movement-spent").textContent = progress.spent;
            document.getElementById("campaign-unlocked-count").textContent = progress.unlocked.length;
            document.getElementById("campaign-heart-count").textContent = progress.hearts;
            document.getElementById("undo-movement").disabled = !state.moves.length || Boolean(state.completedAt);
            players.disabled = Boolean(state.completedAt);
            notice.textContent = state.completedAt ? "This campaign is complete. Reopen it to change scores, players or movement progress. You can still export it or start a new campaign." : progress.balance < 0
                ? `Game History now awards ${-progress.balance} fewer points than you have spent. Your progress is kept. Undo moves or earn more points before spending again.`
                : earned === 0 ? "Save your first game to earn movement points. Existing Game History records count automatically." : "";
            notice.hidden = !notice.textContent;
            const unlocked = document.getElementById("campaign-unlocks");
            unlocked.replaceChildren();
            campaignAchievements(state).forEach(achievement => {
                const item = document.createElement("li");
                item.className = `campaign-achievement${achievement.unlocked ? " is-unlocked" : ""}`;
                const name = document.createElement("span");
                name.textContent = achievement.name;
                item.appendChild(name);
                const date = document.createElement(achievement.unlockedAt ? "time" : "span");
                if (achievement.unlockedAt) {
                    date.dateTime = achievement.unlockedAt;
                    date.textContent = new Date(achievement.unlockedAt).toLocaleDateString("en-GB", {
                        day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London"
                    });
                } else date.textContent = achievement.unlocked ? "Unlocked · Date not recorded" : "Locked";
                item.appendChild(date);
                unlocked.appendChild(item);
            });
            renderMap(progress);
            renderChoices(progress);
        }

        document.getElementById("undo-movement").addEventListener("click", () => {
            try {
                state = readCampaignState(localStorage);
                assertCampaignEditable(localStorage, state.id);
                persist({ ...state, moves: state.moves.slice(0, -1) });
                render();
                status.textContent = "Last move undone. Its movement point is available again.";
            } catch (problem) { error(problem.message); }
        });
        document.getElementById("export-campaign").addEventListener("click", () => {
            try {
                state = readCampaignState(localStorage);
                downloadCampaignFile(buildCampaignFile(state, readGames(localStorage, state.id), rankings));
                status.textContent = "Campaign file prepared for download.";
            } catch (problem) { error(problem.message); }
        });
        document.getElementById("complete-campaign").addEventListener("click", () => {
            try {
                const current = readCampaignState(localStorage);
                persist({ ...current, completedAt: current.completedAt ? null : new Date().toISOString() });
                render();
                status.textContent = state.completedAt ? "Campaign marked complete. Its completion date has been saved." : "Campaign reopened.";
            } catch (problem) { error(problem.message); }
        });
        document.getElementById("new-campaign").addEventListener("click", () => {
            if (!window.confirm("Start a new campaign? Your current campaign and all of its games will be archived here for later download. The new campaign starts with no games or movement points.")) return;
            try {
                state = startNewCampaign(localStorage, rankings);
                players.value = "";
                render();
                status.textContent = "New campaign started. Your previous campaign is saved under Archived campaigns.";
            } catch (problem) { error(problem.message); }
        });
        players.addEventListener("change", () => {
            try {
                assertCampaignEditable(localStorage, state.id);
                persist({ ...readCampaignState(localStorage), players: players.value.trim() });
                status.textContent = "Player names saved.";
            } catch (problem) { error(problem.message); }
        });
        document.getElementById("import-campaign").addEventListener("change", async event => {
            const file = event.target.files[0];
            if (!file) return;
            const campaignBeforeReading = state.id;
            try {
                if (file.size > 10 * 1024 * 1024) throw new Error("Campaign files must be smaller than 10 MB.");
                const text = await file.text();
                const preview = parseCampaignFile(text);
                if (!window.confirm(`Restore the campaign for ${preview.state.players || "unnamed players"} with ${preview.games.length} games? Your current campaign will be archived first.`)) return;
                assertCampaignAssociation(localStorage, campaignBeforeReading);
                state = importCampaignFile(localStorage, text, rankings);
                players.value = state.players;
                render();
                status.textContent = "Campaign restored. Your previous campaign is available under Archived campaigns.";
            } catch (problem) { error(problem.message); }
            finally { event.target.value = ""; }
        });
        window.addEventListener("storage", event => {
            if ([null, "dorfExplorerGames", CAMPAIGN_KEY, ARCHIVE_KEY].includes(event.key)) {
                try {
                    state = readCampaignState(localStorage);
                    players.value = state.players;
                    render();
                } catch (problem) { error(problem.message); }
            }
        });
        render();
        if (state.pathCorrectionRefund) {
            status.textContent = `Path lengths corrected. ${state.pathCorrectionRefund} previously spent movement points were returned to your balance because those circles no longer connect to the updated tree.`;
        }
        document.getElementById("campaign-loading").hidden = true;
        document.getElementById("campaign-content").hidden = false;
    } catch (problem) {
        document.getElementById("campaign-loading").textContent = problem.message;
    }
}

export async function initialiseMovementSummary() {
    const balance = document.getElementById("history-movement-available");
    if (!balance) return;
    try {
        const rankings = await loadGameRankings();
        const state = readCampaignState(localStorage);
        const games = readGames(localStorage, state.id);
        const progress = campaignProgress(state, movementEarned(games, rankings));
        balance.textContent = Math.max(0, progress.balance);
        document.getElementById("history-movement-earned").textContent = progress.earned;
        document.getElementById("history-movement-spent").textContent = progress.spent;
        const debt = document.getElementById("history-movement-note");
        debt.textContent = progress.balance < 0
            ? `Your saved scores now award ${-progress.balance} fewer points than spent. Open Campaign to review your moves.` : "";
    } catch (problem) {
        document.getElementById("history-movement-note").textContent = problem.message;
    }
}
