import test from "node:test";
import assert from "node:assert/strict";

import { createWindIndicator } from "../js/components/wind-indicator.js";

const VISUAL_CASES = [
    { direction: 0, abbreviation: "N", rotation: 180 },
    { direction: 90, abbreviation: "E", rotation: 270 },
    { direction: 180, abbreviation: "S", rotation: 0 },
    { direction: 270, abbreviation: "O", rotation: 90 },
    { direction: 315, abbreviation: "NO", rotation: 135 }
];

test("les cinq orientations de reference rendent le SVG dans le sens attendu", () => {
    for (const item of VISUAL_CASES) {
        const result = createWindIndicator({
            direction: item.direction,
            speed: 11,
            speedText: "11 km/h",
            documentRef: new FakeDocument()
        });
        const svg = findByTag(result.element, "svg");
        const group = findByTag(result.element, "g");

        assert.ok(svg);
        assert.equal(group.attributes.transform, `rotate(${item.rotation} 12 12)`);
        assert.equal(findByClass(result.element, "wind-indicator__abbreviation").textContent, item.abbreviation);
        assert.equal(findByClass(result.element, "wind-indicator__speed").textContent, "11 km/h");
        assert.equal(result.element.attributes["aria-hidden"], "true");
    }
});

test("le composant conserve la vitesse lorsque la fleche est masquee", () => {
    const calm = createWindIndicator({
        direction: 90,
        speed: 0.49,
        speedText: "0 km/h",
        documentRef: new FakeDocument()
    });
    const invalid = createWindIndicator({
        direction: null,
        speed: 11,
        speedText: "11 km/h",
        documentRef: new FakeDocument()
    });

    assert.equal(findByTag(calm.element, "svg"), null);
    assert.equal(findByClass(calm.element, "wind-indicator__speed").textContent, "0 km/h");
    assert.equal(findByTag(invalid.element, "svg"), null);
    assert.equal(findByClass(invalid.element, "wind-indicator__speed").textContent, "11 km/h");
    assert.match(invalid.accessibleLabel, /direction indisponible/);
});

test("l'abreviation peut etre omise sans modifier la rotation", () => {
    const result = createWindIndicator({
        direction: 270,
        speed: 11,
        speedText: "11 km/h",
        showAbbreviation: false,
        documentRef: new FakeDocument()
    });

    assert.equal(findByClass(result.element, "wind-indicator__abbreviation"), null);
    assert.equal(findByTag(result.element, "g").attributes.transform, "rotate(90 12 12)");
});

class FakeDocument {
    createElement(tagName) {
        return new FakeElement(tagName);
    }

    createElementNS(_namespace, tagName) {
        return new FakeElement(tagName);
    }
}

class FakeElement {
    constructor(tagName) {
        this.tagName = tagName;
        this.children = [];
        this.attributes = {};
        this.className = "";
        this.textContent = "";
        this.classList = {
            add: (...names) => {
                this.className = [this.className, ...names].filter(Boolean).join(" ");
            }
        };
    }

    appendChild(child) {
        this.children.push(child);
        return child;
    }

    setAttribute(name, value) {
        this.attributes[name] = String(value);
    }
}

function findByTag(root, tagName) {
    return findNode(root, (node) => node.tagName === tagName);
}

function findByClass(root, className) {
    return findNode(root, (node) => node.className.split(/\s+/).includes(className));
}

function findNode(root, predicate) {
    if (predicate(root)) {
        return root;
    }

    for (const child of root.children) {
        const match = findNode(child, predicate);
        if (match) {
            return match;
        }
    }

    return null;
}
