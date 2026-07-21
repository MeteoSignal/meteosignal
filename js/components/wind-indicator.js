import { resolveWindDirection } from "../core/wind-direction.js?v=1.5.2-location-sync";

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Construit l'indicateur visuel partagé. Le SVG pointe initialement vers le
 * nord ; sa rotation représente le déplacement de l'air, tandis que
 * l'abréviation conserve la provenance météorologique.
 */
export function createWindIndicator({
    direction,
    speed,
    speedText,
    showAbbreviation = true,
    documentRef = globalThis.document
} = {}) {
    const presentation = resolveWindDirection({ direction, speed });
    const element = documentRef.createElement("span");
    element.className = "wind-indicator";
    element.setAttribute("aria-hidden", "true");

    if (presentation.showArrow) {
        element.appendChild(createArrow(documentRef, presentation.rotation));

        if (showAbbreviation) {
            const abbreviation = documentRef.createElement("span");
            abbreviation.className = "wind-indicator__abbreviation";
            abbreviation.textContent = presentation.sector.abbreviation;
            element.appendChild(abbreviation);

            const separator = documentRef.createElement("span");
            separator.className = "wind-indicator__separator";
            separator.textContent = "·";
            element.appendChild(separator);
        }
    } else {
        element.classList.add("wind-indicator--without-arrow");
    }

    const speedValue = documentRef.createElement("span");
    speedValue.className = "wind-indicator__speed";
    speedValue.textContent = speedText ?? "-- km/h";
    element.appendChild(speedValue);

    return {
        element,
        accessibleLabel: presentation.accessibleLabel,
        presentation
    };
}

function createArrow(documentRef, rotation) {
    const svg = documentRef.createElementNS(SVG_NS, "svg");
    svg.setAttribute("class", "wind-indicator__arrow");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("focusable", "false");
    svg.setAttribute("aria-hidden", "true");

    const group = documentRef.createElementNS(SVG_NS, "g");
    group.setAttribute("transform", `rotate(${rotation} 12 12)`);

    const path = documentRef.createElementNS(SVG_NS, "path");
    path.setAttribute("d", "M12 21V5M6.5 10.5 12 5l5.5 5.5");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    path.setAttribute("stroke-width", "2.2");

    group.appendChild(path);
    svg.appendChild(group);
    return svg;
}
