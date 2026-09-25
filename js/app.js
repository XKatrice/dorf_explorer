import { calculateScore } from "./scoring.js";
import { saveGame } from "./storage.js";
import { initialiseCampaign } from "./campaign.js";
import { initialiseSpecials } from "./specials.js";
initialiseCampaign();

initialiseSpecials();



const saveButton = document.getElementById("save-game");

if (saveButton) {
    saveButton.addEventListener("click", saveGame);
}

const scoreInputs = document.querySelectorAll(".score-input");

scoreInputs.forEach(function (input) {
    input.addEventListener("input", calculateScore);


console.log("score inputs:", scoreInputs);




});
