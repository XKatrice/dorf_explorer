import { calculateScore } from "./scoring.js?v=fdb65b1ae0a8";
import { saveGame, loadGameForEditing } from "./storage.js?v=fdb65b1ae0a8";
import { initialiseCampaign } from "./campaign.js?v=fdb65b1ae0a8";
import { initialiseSpecials } from "./specials.js?v=fdb65b1ae0a8";
import { initialiseCardNavigation } from "./card-navigation.js?v=fdb65b1ae0a8";
import { initialiseFlags } from "./flags.js?v=fdb65b1ae0a8";
import { initialiseCampaignTracker, initialiseMovementSummary } from "./campaign-tracker.js?v=fdb65b1ae0a8";
import { initialiseScoreValidation } from "./validation.js?v=fdb65b1ae0a8";
import { initialiseManualAchievements } from "./manual-achievements.js?v=fdb65b1ae0a8";
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
