import { calculateScore } from "./scoring.js?v=0f4147c0c5d0";
import { saveGame, loadGameForEditing } from "./storage.js?v=0f4147c0c5d0";
import { initialiseCampaign } from "./campaign.js?v=0f4147c0c5d0";
import { initialiseSpecials } from "./specials.js?v=0f4147c0c5d0";
import { initialiseCardNavigation } from "./card-navigation.js?v=0f4147c0c5d0";
import { initialiseFlags } from "./flags.js?v=0f4147c0c5d0";
import { initialiseCampaignTracker, initialiseMovementSummary } from "./campaign-tracker.js?v=0f4147c0c5d0";
import { initialiseScoreValidation } from "./validation.js?v=0f4147c0c5d0";
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
