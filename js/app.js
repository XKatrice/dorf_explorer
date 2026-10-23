import { calculateScore } from "./scoring.js?v=e8f9789fcdec";
import { saveGame, loadGameForEditing } from "./storage.js?v=e8f9789fcdec";
import { initialiseCampaign } from "./campaign.js?v=e8f9789fcdec";
import { initialiseSpecials } from "./specials.js?v=e8f9789fcdec";
import { initialiseCardNavigation } from "./card-navigation.js?v=e8f9789fcdec";
import { initialiseFlags } from "./flags.js?v=e8f9789fcdec";
import { initialiseCampaignTracker, initialiseMovementSummary } from "./campaign-tracker.js?v=e8f9789fcdec";
import { initialiseScoreValidation } from "./validation.js?v=e8f9789fcdec";
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
