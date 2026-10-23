import { calculateScore } from "./scoring.js?v=a8d45964ab16";
import { saveGame, loadGameForEditing } from "./storage.js?v=a8d45964ab16";
import { initialiseCampaign } from "./campaign.js?v=a8d45964ab16";
import { initialiseSpecials } from "./specials.js?v=a8d45964ab16";
import { initialiseCardNavigation } from "./card-navigation.js?v=a8d45964ab16";
import { initialiseFlags } from "./flags.js?v=a8d45964ab16";
import { initialiseCampaignTracker, initialiseMovementSummary } from "./campaign-tracker.js?v=a8d45964ab16";
import { initialiseScoreValidation } from "./validation.js?v=a8d45964ab16";
initialiseCampaign().catch(error => {
    const history = document.getElementById("saved-games-list");
    if (history) history.textContent = error.message;
});
initialiseCampaignTracker();
initialiseMovementSummary();

const editingGame = loadGameForEditing();
initialiseSpecials(editingGame);
initialiseFlags();
initialiseScoreValidation();
initialiseCardNavigation();



const saveButton = document.getElementById("save-game");

if (saveButton) {
    saveButton.addEventListener("click", saveGame);
}

const scoreInputs = document.querySelectorAll(".score-input");

scoreInputs.forEach(function (input) {
    input.addEventListener("input", calculateScore);






});
