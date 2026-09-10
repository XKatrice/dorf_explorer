const calculateButton = document.getElementById("calculate_score");

calculateButton.addEventListener("click", calculateScore);

function calculateScore() {


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

    const longRailInput = document.getElementById("long_rail");
    const longRailPoints = Number(longRailInput.value);

    const longRiverInput = document.getElementById("long_river");
    const longRiverPoints = Number(longRiverInput.value);

    const flagsInput = document.getElementById("flags_points");
    const flagsPoints = Number(flagsInput.value);


    const heartsInput = document.getElementById("heart_points");
    const heartsPoints = Number(heartsInput.value);

    const harvestInput = document.getElementById("harvest_festival");
    const harvestPoints = Number(harvestInput.value);

    const circusInput = document.getElementById("circus");

    let circusPoints = 0;

    if (circusInput.checked) {
        circusPoints = 10;
    }

    const taskTotal = forestPoints + grainPoints + villagePoints + railPoints + riverPoints

    const totalPoints = taskTotal + longRailPoints + longRiverPoints + flagsPoints + heartsPoints + harvestPoints + circusPoints;


    const taskScoreDisplay = document.getElementById("task_points");

    taskScoreDisplay.textContent = taskTotal;

    const scoreDisplay = document.getElementById("total_points");

    scoreDisplay.textContent = totalPoints;

  console.log(circusPoints);
}
