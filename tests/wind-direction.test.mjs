import test from "node:test";
import assert from "node:assert/strict";

import {
    getWindRotation,
    getWindSector,
    normalizeWindAngle,
    resolveWindDirection,
    WIND_DIRECTION_CONSTANTS
} from "../js/core/wind-direction.js";

const ABBREVIATIONS = [
    "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
    "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO"
];

test("les angles sont normalises dans le tour meteorologique", () => {
    assert.equal(normalizeWindAngle(0), 0);
    assert.equal(normalizeWindAngle(360), 0);
    assert.equal(normalizeWindAngle(721), 1);
    assert.equal(normalizeWindAngle(-90), 270);
    assert.equal(normalizeWindAngle(-721), 359);
});

test("les 16 secteurs suivent des intervalles de 22,5 degres", () => {
    ABBREVIATIONS.forEach((abbreviation, index) => {
        assert.equal(getWindSector(index * 22.5).abbreviation, abbreviation);
    });
    assert.equal(WIND_DIRECTION_CONSTANTS.sectorCount, 16);
    assert.equal(WIND_DIRECTION_CONSTANTS.degreesPerSector, 22.5);
});

test("les limites de secteurs restent deterministes", () => {
    assert.equal(getWindSector(11.24).abbreviation, "N");
    assert.equal(getWindSector(11.25).abbreviation, "NNE");
    assert.equal(getWindSector(33.74).abbreviation, "NNE");
    assert.equal(getWindSector(33.75).abbreviation, "NE");
    assert.equal(getWindSector(348.74).abbreviation, "NNO");
    assert.equal(getWindSector(348.75).abbreviation, "N");
});

test("la fleche montre le deplacement de l'air avec une rotation de 180 degres", () => {
    assert.equal(getWindRotation(0), 180);
    assert.equal(getWindRotation(90), 270);
    assert.equal(getWindRotation(180), 0);
    assert.equal(getWindRotation(270), 90);
    assert.equal(getWindRotation(315), 135);
});

test("le vent calme ou invalide masque toute direction arbitraire", () => {
    assert.equal(resolveWindDirection({ direction: 90, speed: 0 }).showArrow, false);
    assert.equal(resolveWindDirection({ direction: 90, speed: 0.49 }).showArrow, false);
    assert.equal(resolveWindDirection({ direction: 90, speed: 0.5 }).showArrow, true);
    assert.equal(resolveWindDirection({ direction: null, speed: 11 }).showArrow, false);
    assert.equal(resolveWindDirection({ direction: Number.NaN, speed: 11 }).showArrow, false);
    assert.equal(resolveWindDirection({ direction: 90, speed: Number.POSITIVE_INFINITY }).showArrow, false);
    assert.equal(resolveWindDirection({ direction: 90, speed: -1 }).showArrow, false);
});

test("le libelle accessible distingue provenance angle et vitesse", () => {
    const west = resolveWindDirection({ direction: 270, speed: 11 });
    assert.equal(west.sector.abbreviation, "O");
    assert.equal(
        west.accessibleLabel,
        "Vent de secteur ouest, venant de 270 degrés, à 11 kilomètres par heure."
    );
    assert.equal(
        resolveWindDirection({ direction: 0, speed: 0.4 }).accessibleLabel,
        "Vent calme, à 0,4 kilomètres par heure."
    );
});
