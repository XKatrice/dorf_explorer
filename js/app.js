import { calculateScore } from "./scoring.js?v=4e224e0d154c";
import { saveGame, loadGameForEditing } from "./storage.js?v=4e224e0d154c";
import { initialiseCampaign } from "./campaign.js?v=4e224e0d154c";
import { initialiseSpecials } from "./specials.js?v=4e224e0d154c";
import { initialiseCardNavigation } from "./card-navigation.js?v=4e224e0d154c";
import { initialiseFlags } from "./flags.js?v=4e224e0d154c";
import { initialiseCampaignTracker, initialiseMovementSummary } from "./campaign-tracker.js?v=4e224e0d154c";
import { initialiseScoreValidation } from "./validation.js?v=4e224e0d154c";
import { initialiseManualAchievements } from "./manual-achievements.js?v=4e224e0d154c";
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
