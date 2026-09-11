
const scoreInputs = document.querySelectorAll(".score-input");

scoreInputs.forEach(function(input) {
    input.addEventListener("input", calculateScore);
});


function calculateScore() {


// Tasks Scores 

    const forestInput = document.getElementById("forest_tasks");
    const forestPoints = Number(forestInput.value);

    const grainInput = document.getElementById("grain_tasks");
    const grainPoints = Number(grainInput.value);

    const villageInput = document.getElementById("village_tasks");
    const villagePoints = Number(villageInput.value);

    const railInput = document.getElementById("rail_tasks");
    const railPoints = Number(railInput.value);

    const riverInput = document.getElementById("river_tasks");
    const riverPoints = Number(riverInput.value);

 // Long river and rail scores 

    const longRailInput = document.getElementById("long_rail");
    const longRailPoints = Number(longRailInput.value);

    const longRiverInput = document.getElementById("long_river");
    const longRiverPoints = Number(longRiverInput.value);

// Flags scoring

    const forestFlagInput = document.getElementById("flag_forest");
    const forestFlagsPoints = Number(forestFlagInput.value);

    const grainFlagInput = document.getElementById("flag_grain");
    const grainFlagsPoints = Number(grainFlagInput.value);

    const villageFlagInput = document.getElementById("flag_village");
    const villageFlagsPoints = Number(villageFlagInput.value);

// Unlocked Scoring

    const heartsInput = document.getElementById("heart_points");
    const heartsPoints = Number(heartsInput.value);

    const harvestInput = document.getElementById("harvest_festival");
    const harvestPoints = Number(harvestInput.value);

    const circusInput = document.getElementById("circus");

    let circusPoints = 0;

    if (circusInput.checked) {
        circusPoints = 10;
    }

// subtotals 

    const taskTotal = forestPoints + grainPoints + villagePoints + railPoints + riverPoints

    const flagTotal = forestFlagsPoints + grainFlagsPoints + villageFlagsPoints

    const longTotal = longRailPoints + longRiverPoints

    const specialPoints = heartsPoints + harvestPoints + circusPoints

    const totalPoints = taskTotal + longTotal + flagTotal + specialPoints;

// display subtotals

    const taskScoreDisplay = document.getElementById("task_points");
    taskScoreDisplay.textContent = taskTotal;
     
    const summaryTaskScoreDisplay = document.getElementById("summary_task_points");
    summaryTaskScoreDisplay.textContent = taskTotal;

    const specialScoreDisplay = document.getElementById("special_points")
    specialScoreDisplay.textContent = specialPoints

    const scoreDisplay = document.getElementById("total_points");
    scoreDisplay.textContent = totalPoints;

    const flagScoreDisplay = document.getElementById("flag_points");
    flagScoreDisplay.textContent = flagTotal;

    const longScoreDisplay = document.getElementById("longest_points");
    longScoreDisplay.textContent = longTotal;

    const longRiverScoreDisplay = document.getElementById("points_long_river");
    longRiverScoreDisplay.textContent = longRiverPoints;

    const longRailScoreDisplay = document.getElementById("points_long_rail");
    longRailScoreDisplay.textContent = longRailPoints;

    const summaryFlagScoreDisplay = document.getElementById("summary_flag_points");
    summaryFlagScoreDisplay.textContent = flagTotal;

    const summarySpecialScoreDisplay = document.getElementById("summary_special_points");
    summarySpecialScoreDisplay.textContent = specialPoints;

    const summaryTaskForestDisplay = document.getElementById("summary_task_forest");
    summaryTaskForestDisplay.textContent = forestPoints;

    const summaryTaskGrainDisplay = document.getElementById("summary_task_grain");
    summaryTaskGrainDisplay.textContent = grainPoints;

    const summaryTaskVillageDisplay = document.getElementById("summary_task_village");
    summaryTaskVillageDisplay.textContent = villagePoints;

    const summaryFlagForestDisplay = document.getElementById("summary_flag_forest");
    summaryFlagForestDisplay.textContent = forestFlagsPoints;

    const summaryFlagGrainDisplay = document.getElementById("summary_flag_grain");
    summaryFlagGrainDisplay.textContent = grainFlagsPoints;

    const summaryFlagVillageDisplay = document.getElementById("summary_flag_village");
    summaryFlagVillageDisplay.textContent = villageFlagsPoints;
    
    const summaryRedHeartDisplay = document.getElementById("summary_redhearts");
    summaryRedHeartDisplay.textContent = heartsPoints;

    const summaryHarvestDisplay = document.getElementById("summary_harvest");
    summaryHarvestDisplay.textContent = harvestPoints;

    const summaryCircusDisplay = document.getElementById("summary_circus");
    summaryCircusDisplay.textContent = circusPoints;
}
