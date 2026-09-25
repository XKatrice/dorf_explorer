
export function saveGame() {

    const game = {
        total: Number(document.getElementById("total_points").textContent),
        tasks: Number(document.getElementById("task_points").textContent),
        flags: Number(document.getElementById("flag_points").textContent),

        longestRiver: Number(
            document.getElementById("points_long_river").textContent
        ),

        longestRailway: Number(
            document.getElementById("points_long_rail").textContent
        ),

        specials: Number(
            document.getElementById("special_points").textContent
        )
    };

    console.log(game);
    console.log("Saving is not implemented yet")
}

