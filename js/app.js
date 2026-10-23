import { calculateScore } from "./scoring.js";
import { saveGame, loadGameForEditing } from "./storage.js";
import { initialiseCampaign } from "./campaign.js";
import { initialiseSpecials } from "./specials.js";
import { initialiseCardNavigation } from "./card-navigation.js";
import { initialiseFlags } from "./flags.js";
import { initialiseCampaignTracker, initialiseMovementSummary } from "./campaign-tracker.js";
import { initialiseScoreValidation } from "./validation.js";
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


console.log("score inputs:", scoreInputs);




});
