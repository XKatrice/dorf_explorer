// A separate loader can report failed imports before the application starts.
function showAppLoadError(error) {
    console.error("Dorf Explorer could not start:", error);
    const message = "The app could not finish loading. Check your connection and reload the app. Your saved games have not been cleared.";
    for (const id of ["campaign-loading", "history-movement-note", "editing-status"]) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = message;
            element.hidden = false;
        }
    }
    let notice = document.getElementById("app-load-status");
    if (!notice) {
        notice = document.createElement("div");
        notice.id = "app-load-status";
        notice.setAttribute("role", "alert");
        const text = document.createElement("p");
        text.textContent = message;
        const reload = document.createElement("button");
        reload.type = "button";
        reload.textContent = "Reload app";
        reload.addEventListener("click", () => {
            const url = new URL(window.location.href);
            url.searchParams.set("reload", String(Date.now()));
            window.location.assign(url.href);
        });
        notice.append(text, reload);
        document.body.prepend(notice);
    }
}

import("./app.js?v=a8d45964ab16").catch(showAppLoadError);
