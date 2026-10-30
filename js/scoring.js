import { readScoreInput, isValidScore } from "./validation.js?v=cd8007e0e601";

export function calculateScore() {


// Tasks Scores 

    const forestInput = document.getElementById("forest_tasks");
    const forestPoints = (readScoreInput(forestInput) ?? 0);

    const grainInput = document.getElementById("grain_tasks");
    const grainPoints = (readScoreInput(grainInput) ?? 0);

    const villageInput = document.getElementById("village_tasks");
    const villagePoints = (readScoreInput(villageInput) ?? 0);

    const railInput = document.getElementById("rail_tasks");
    const railPoints = (readScoreInput(railInput) ?? 0);

    const riverInput = document.getElementById("river_tasks");
    const riverPoints = (readScoreInput(riverInput) ?? 0);

 // Long river and rail scores 

    const longRailInput = document.getElementById("long_rail");
    const longRailPoints = (readScoreInput(longRailInput) ?? 0);

    const longRiverInput = document.getElementById("long_river");
    const longRiverPoints = (readScoreInput(longRiverInput) ?? 0);

// Flags scoring

    const forestFlagInput = document.getElementById("flag_forest");
    const forestFlagsPoints = (readScoreInput(forestFlagInput) ?? 0);

    const grainFlagInput = document.getElementById("flag_grain");
    const grainFlagsPoints = (readScoreInput(grainFlagInput) ?? 0);

    const villageFlagInput = document.getElementById("flag_village");
    const villageFlagsPoints = (readScoreInput(villageFlagInput) ?? 0);

    const harbourInput = document.getElementById("harbour");
    const harbourPoints = (readScoreInput(harbourInput) ?? 0);

    const trainStationInput = document.getElementById("train_station");
    const trainStationPoints = (readScoreInput(trainStationInput) ?? 0);

// Unlocked Scoring

    const heartsInput = document.getElementById("heart_points");
    const heartsPoints = (readScoreInput(heartsInput) ?? 0);

    const watchtowerInput = document.getElementById("watchtower_points");
    const watchtowerPoints = (readScoreInput(watchtowerInput) ?? 0);

    const forestCabinInput = document.getElementById("forest_cabin_points");
    const forestCabinPoints = (readScoreInput(forestCabinInput) ?? 0);

    const shipInput = document.getElementById("ship_points");
    const shipPoints = (readScoreInput(shipInput) ?? 0);

    const locomotiveInput = document.getElementById("locomotive_points");
    const locomotivePoints = (readScoreInput(locomotiveInput) ?? 0);

    const harvestInput = document.getElementById("harvest_points");
    const harvestPoints = (readScoreInput(harvestInput) ?? 0);

    const signalmanInput = document.getElementById("signalman_points");
    const signalmanPoints = (readScoreInput(signalmanInput) ?? 0);

    const shepherdessInput = document.getElementById("shepherdess_points");
    const shepherdessPoints = (readScoreInput(shepherdessInput) ?? 0);

    const hillPoints = (readScoreInput(document.getElementById("hill_points")) ?? 0);
    const balloonPoints = (readScoreInput(document.getElementById("balloon_points")) ?? 0);

    const circusInput = document.getElementById("circus");

    const constructionSitePoints = ["forest", "field", "village"].reduce((total, landscape) =>
        total + (document.getElementById(`construction-site-${landscape}`).checked ? 7 : 0), 0);
    document.getElementById("construction_site_points").value = constructionSitePoints;
    document.getElementById("construction-site-total").textContent = constructionSitePoints;
    document.getElementById("summary_construction_site").textContent = constructionSitePoints;

    let circusPoints = 0;

    if (circusInput.checked) {
        circusPoints = 10;
    }

// subtotals 

    const taskTotal = forestPoints + grainPoints + villagePoints + railPoints + riverPoints

    // Achievement progress counts special tasks once; their game scores already include x2.
    const achievementTaskTotal = taskTotal +
        (harvestPoints + watchtowerPoints + forestCabinPoints + shipPoints + locomotivePoints) / 2;

    const flagTotal = forestFlagsPoints + grainFlagsPoints + villageFlagsPoints + harbourPoints + trainStationPoints

    const longTotal = longRailPoints + longRiverPoints

    const specialPoints = heartsPoints + harvestPoints + circusPoints + watchtowerPoints + forestCabinPoints + shipPoints + locomotivePoints + signalmanPoints + shepherdessPoints + hillPoints + balloonPoints + constructionSitePoints

    const totalPoints = taskTotal + longTotal + flagTotal + specialPoints;

// display subtotals

    const taskScoreDisplay = document.getElementById("task_points");
    taskScoreDisplay.textContent = taskTotal;
     
    const summaryTaskScoreDisplay = document.getElementById("summary_task_points");
    summaryTaskScoreDisplay.textContent = taskTotal;

    document.getElementById("achievement-task-total").textContent = achievementTaskTotal;

    const specialScoreDisplay = document.getElementById("special_points")
    specialScoreDisplay.textContent = specialPoints

    const scoreDisplay = document.getElementById("total_points");
    scoreDisplay.textContent = isValidScore(totalPoints) ? totalPoints : "Total is too large";

    document.getElementById("achievement-balloon-total").textContent = isValidScore(totalPoints) ? totalPoints : "Total is too large";
    document.getElementById("achievement-balloon-status").textContent = !isValidScore(totalPoints)
        ? "Reduce scores to calculate achievement progress."
        : totalPoints >= 300
        ? "Achievement reached!"
        : `${300 - totalPoints} ${300 - totalPoints === 1 ? "point" : "points"} to go`;

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

    const summaryHarbourDisplay = document.getElementById("summary_harbour");
    summaryHarbourDisplay.textContent = harbourPoints;

    const summaryTrainStationDisplay = document.getElementById("summary_train_station");
    summaryTrainStationDisplay.textContent = trainStationPoints;
    
    const summaryRedHeartDisplay = document.getElementById("summary_redhearts");
    summaryRedHeartDisplay.textContent = heartsPoints;

    const summaryHarvestDisplay = document.getElementById("summary_harvest");
    summaryHarvestDisplay.textContent = harvestPoints;

    const summaryWatchtowerDisplay = document.getElementById("summary_watchtower");
    summaryWatchtowerDisplay.textContent = watchtowerPoints;

    const summaryForestCabinDisplay = document.getElementById("summary_forest_cabin");
    summaryForestCabinDisplay.textContent = forestCabinPoints;

    const summaryShipDisplay = document.getElementById("summary_ship");
    summaryShipDisplay.textContent = shipPoints;

    const summaryLocomotiveDisplay = document.getElementById("summary_locomotive");
    summaryLocomotiveDisplay.textContent = locomotivePoints;

    const summarySignalmanDisplay = document.getElementById("summary_signalman");
    summarySignalmanDisplay.textContent = signalmanPoints;

    const summaryShepherdessDisplay = document.getElementById("summary_shepherdess");
    summaryShepherdessDisplay.textContent = shepherdessPoints;

    document.getElementById("summary_hill").textContent = hillPoints;
    document.getElementById("summary_balloon").textContent = balloonPoints;

    const summaryCircusDisplay = document.getElementById("summary_circus");
    summaryCircusDisplay.textContent = circusPoints;
    return totalPoints;
}
