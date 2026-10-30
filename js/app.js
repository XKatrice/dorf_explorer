import { calculateScore } from "./scoring.js?v=cd8007e0e601";
import { saveGame, loadGameForEditing } from "./storage.js?v=cd8007e0e601";
import { initialiseCampaign } from "./campaign.js?v=cd8007e0e601";
import { initialiseSpecials } from "./specials.js?v=cd8007e0e601";
import { initialiseCardNavigation } from "./card-navigation.js?v=cd8007e0e601";
import { initialiseFlags } from "./flags.js?v=cd8007e0e601";
import { initialiseCampaignTracker, initialiseMovementSummary } from "./campaign-tracker.js?v=cd8007e0e601";
import { initialiseScoreValidation } from "./validation.js?v=cd8007e0e601";
import { initialiseManualAchievements } from "./manual-achievements.js?v=cd8007e0e601";
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
initialiseManualAchievements();



const saveButton = document.getElementById("save-game");

if (saveButton) {
    saveButton.addEventListener("click", saveGame);
}

const scoreInputs = document.querySelectorAll(".score-input");

scoreInputs.forEach(function (input) {
    input.addEventListener("input", calculateScore);






});
