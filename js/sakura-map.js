import { boxes, nextRouteMoves, routes, sakuraMoveCost } from "./sakura-rules.js?v=9a57946151f7";

const svgNamespace = "http://www.w3.org/2000/svg";
const locations = {
    "Start": [155, 1480],
    "Box 1": [390, 1480],
    "Box 2": [650, 1480],
    "Lake": [480, 1370],
    "Crossroads": [810, 1370],
    "Box 3": [650, 1260],
    "Temples": [790, 1160],
    "Hot springs": [790, 1040],
    "Bridges": [605, 940],
    "Junction near Bridges": [590, 845],
    "Extra temple near Bridges": [470, 825, "Extra temple"],
    "Calligrapher": [465, 670],
    "Extra bridge": [655, 630],
    "Observatory": [600, 495],
    "Counting house": [795, 315],
    "Mt. Fuji": [620, 125],
    "Gates": [920, 930],
    "Extra temple near Gates": [920, 810, "Extra temple"],
    "Hermit": [800, 720],
    "Extra gate": [910, 613],
    "Cartographer": [900, 485],
    "Tea master": [250, 1175],
    "Moss collector": [250, 970],
    "Sumo wrestler": [100, 775],
    "Rice farmer": [345, 775],
    "Onigiri": [100, 540],
    "Drinks": [340, 540],
    "Gift": [220, 330],
    "Cherry blossoms": [220, 125]
};

const bends = {
    "Box 3": -45,
    "Hot springs": 28,
    "Counting house": -45,
    "Mt. Fuji": 60,
    "Moss collector": -58,
    "Onigiri": -55,
    "Drinks": 55,
    "Cherry blossoms": -85
};
const blossomNodes = new Set(routes.filter(route => route.currency === "blossoms").map(route => route.to));

function svgElement(tag, attributes = {}, text) {
    const element = document.createElementNS(svgNamespace, tag);
    for (const [attribute, value] of Object.entries(attributes)) element.setAttribute(attribute, value);
    if (text !== undefined) element.textContent = text;
    return element;
}

export function createSakuraMap(container, advance) {
    const svg = svgElement("svg", { viewBox: "0 0 1000 1540" });
    const lines = svgElement("g", { "aria-hidden": "true" });
    const spaces = svgElement("g");
    const destinations = svgElement("g");
    const markers = new Map();

    function addMarker(parent, space, x, y, currency, label, destination = false) {
        const flower = currency === "blossoms";
        const finalFlower = space === "Cherry blossoms";
        const group = svgElement("g", {
            class: `campaign-step sakura-map-marker${flower ? " sakura-map-flower" : ""}`,
            transform: `translate(${x} ${y})`, "data-space": space
        });
        if (space !== "Start" && !boxes.has(space)) {
            group.setAttribute("role", "button");
            group.append(svgElement("circle", { r: finalFlower ? 22 : 11, class: "campaign-step-hit" }));
            const activate = () => {
                const route = markers.get(space).availableRoute;
                if (route) advance(route, space);
            };
            group.addEventListener("click", activate);
            group.addEventListener("keydown", event => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                activate();
            });
        }
        if (flower) {
            const petals = svgElement("g", { class: "sakura-blossom-shape", "aria-hidden": "true" });
            if (finalFlower) petals.setAttribute("transform", "scale(1.75)");
            for (let angle = 0; angle < 360; angle += 72) {
                petals.append(svgElement("ellipse", { cy: -6, rx: 3.9, ry: 6.5, transform: `rotate(${angle})` }));
            }
            petals.append(svgElement("circle", { r: 3.6 }));
            group.append(petals);
        } else {
            group.append(svgElement("circle", { r: destination ? 10 : 7 }));
        }
        if (finalFlower) group.append(svgElement("text", { y: 4, class: "sakura-map-cost", "aria-hidden": "true" }, "30"));
        if (destination && space !== "Junction near Bridges") {
            group.append(svgElement("text", { y: finalFlower ? -28 : -18, class: "sakura-map-label",
                "aria-hidden": space === "Start" || boxes.has(space) ? "false" : "true" }, label));
        }
        const costLabel = flower ? `${sakuraMoveCost(space)} cherry blossom${finalFlower ? "s" : ""}` : "1 movement point";
        markers.set(space, { group, label: `${label}, ${costLabel}`, availableRoute: null });
        parent.append(group);
    }

    for (const route of routes) {
        const [x1, y1] = locations[route.from];
        const [x2, y2] = locations[route.to];
        const distance = Math.hypot(x2 - x1, y2 - y1);
        const bend = bends[route.to] || 0;
        const cx = (x1 + x2) / 2 + (y1 - y2) * bend / distance;
        const cy = (y1 + y2) / 2 + (x2 - x1) * bend / distance;
        lines.append(svgElement("path", {
            d: `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`,
            class: `sakura-map-line sakura-map-line--${route.currency}`
        }));
        route.spaces.forEach((space, index) => {
            const t = (index + 1) / route.length;
            const i = 1 - t;
            addMarker(spaces, space, i * i * x1 + 2 * i * t * cx + t * t * x2,
                i * i * y1 + 2 * i * t * cy + t * t * y2, route.currency,
                `${route.from} to ${route.to}, space ${index + 1}`);
        });
    }
    for (const [name, [x, y, caption = name]] of Object.entries(locations)) {
        addMarker(destinations, name, x, y, blossomNodes.has(name) ? "blossoms" : "movement", caption, true);
    }
    svg.append(lines, spaces, destinations);
    container.append(svg);

    return progress => {
        const options = new Map();
        for (const route of routes) {
            for (const space of nextRouteMoves(route, progress)) {
                if (progress[route.currency] >= sakuraMoveCost(space)) options.set(space, route);
            }
        }
        for (const [space, marker] of markers) {
            const filled = progress.reached.has(space);
            const available = options.has(space);
            marker.availableRoute = options.get(space);
            marker.group.classList.toggle("is-filled", filled);
            marker.group.classList.toggle("is-available", available);
            if (space === "Start" || boxes.has(space)) continue;
            marker.group.setAttribute("tabindex", available ? "0" : "-1");
            marker.group.setAttribute("aria-disabled", String(!available));
            marker.group.setAttribute("aria-label", `${marker.label}${filled ? ", filled" : ""}`);
        }
    };
}
