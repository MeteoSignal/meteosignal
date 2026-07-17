import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { PRIVACY_RETURN_MAX_AGE_MS } from "../js/privacy-return.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INDEX_SOURCE = read("index.html");
const PRIVACY_SOURCE = read("confidentialite.html");
const PRIVACY_TEXT = htmlText(PRIVACY_SOURCE);
const APP_SOURCE = read("js/app.js");
const SEARCH_SOURCE = read("js/components/search.js");
const FORECAST_SOURCE = read("js/services/openmeteo.service.js");
const PROVIDER_SOURCE = read("js/services/weather-provider.js");
const ORCHESTRATOR_SOURCE = read("js/services/weather-orchestrator.service.js");
const SW_SOURCE = read("sw.js");

test("la politique porte la date du 14 juillet 2026 avec la version publique 1.4.2", () => {
    assert.match(PRIVACY_TEXT, /Dernière mise à jour : 14 juillet 2026/);
    assert.equal(JSON.parse(read("package.json")).version, "1.4.2");
    assert.match(read("config/config.js"), /version:\s*"1\.4\.2"/);
});

test("la recherche est decrite sans historique applicatif ni terme dans l'URL de secours", () => {
    assert.match(PRIVACY_TEXT, /ne conserve aucun historique applicatif des recherches/i);
    assert.match(PRIVACY_TEXT, /formulaire HTML de secours ne place plus le terme recherché dans l’URL envoyée à l’hébergeur/i);
    assert.match(PRIVACY_TEXT, /historique de saisie du clavier ou du navigateur dépend des réglages/i);

    const form = INDEX_SOURCE.match(/<form\b[^>]*data-search-form[\s\S]*?<\/form>/)?.[0] ?? "";
    const input = form.match(/<input\b[^>]*id="city-search"[^>]*>/)?.[0] ?? "";
    assert.match(form, /\baction="\.\/"/);
    assert.match(form, /\bmethod="get"/);
    assert.doesNotMatch(input, /\sname\s*=/);
});

test("localStorage et sa conservation locale sont documentes factuellement", () => {
    assert.match(PRIVACY_TEXT, /ville active et les villes favorites[^.]*localStorage/i);
    assert.match(PRIVACY_TEXT, /position actuelle[^.]*coordonnées[^.]*stockage local/i);
    assert.match(PRIVACY_TEXT, /jusqu’à leur modification, au retrait des favoris, à l’effacement des données/i);
    assert.match(PRIVACY_TEXT, /validation et la réparation locales[^.]*peuvent supprimer une entrée invalide/i);
});

test("sessionStorage est limite a cinq minutes et ne contient aucune donnee meteo", () => {
    assert.equal(PRIVACY_RETURN_MAX_AGE_MS, 5 * 60 * 1000);
    assert.match(PRIVACY_TEXT, /sessionStorage/);
    assert.match(PRIVACY_TEXT, /chemin interne de retour, la position de défilement, la cible de focus et un horodatage/i);
    assert.match(PRIVACY_TEXT, /conservé au maximum cinq minutes/i);
    assert.match(PRIVACY_TEXT, /supprimé après une restauration réussie/i);
    assert.match(PRIVACY_TEXT, /supprimé à la fin de la session selon le fonctionnement du navigateur/i);
    assert.match(PRIVACY_TEXT, /Aucune ville, coordonnée ou réponse météo n’est enregistrée dans ce contexte temporaire/i);
});

test("Cache Storage et cache HTTP no-store sont clairement distingues", () => {
    assert.match(PRIVACY_TEXT, /Cache Storage de la PWA contient des fichiers statiques publics/i);
    assert.match(PRIVACY_TEXT, /réponses Forecast, Air Quality et Geocoding ne sont pas enregistrées dans ce cache/i);
    assert.match(PRIVACY_TEXT, /cache HTTP avec l’option cache: "no-store"/i);
    assert.match(PRIVACY_TEXT, /système d’exploitation, le fournisseur d’accès ou le serveur distant/i);
    assert.match(SW_SOURCE, /"\.\/confidentialite\.html"/);
});

test("la geolocalisation, Open-Meteo, GitHub Pages et le lien externe restent documentes", () => {
    assert.match(PRIVACY_TEXT, /La géolocalisation est facultative/i);
    assert.match(PRIVACY_TEXT, /Open-Meteo pour le géocodage, les prévisions météo et la qualité de l’air/i);
    assert.match(PRIVACY_TEXT, /MeteoSignal est hébergé par GitHub Pages/i);
    assert.match(PRIVACY_SOURCE, /href="https:\/\/open-meteo\.com\/en\/terms"[\s\S]*?rel="noopener noreferrer"/);
});

test("les douze titres, les deux retours et le module partage sont preserves", () => {
    assert.equal((PRIVACY_SOURCE.match(/<h2\b/g) ?? []).length, 12);
    assert.equal((PRIVACY_SOURCE.match(/data-privacy-return/g) ?? []).length, 2);
    assert.match(INDEX_SOURCE, /id="privacy-footer-link"[^>]*href="confidentialite\.html"/);
    assert.match(PRIVACY_SOURCE, /js\/privacy-return\.js\?v=1\.4\.2-immersive-dashboard-p6f/);
});

test("la revision P1D-4 invalide les entrees sans perdre la chaine P1D-3", () => {
    const deploymentRevision = "1\\.4\\.2-immersive-dashboard-p6f";
    const apiRevision = deploymentRevision;

    assert.match(INDEX_SOURCE, new RegExp(`js/app\\.js\\?v=${deploymentRevision}`));
    assert.match(INDEX_SOURCE, new RegExp(`js/privacy-return\\.js\\?v=${deploymentRevision}`));
    assert.match(APP_SOURCE, new RegExp(`components/search\\.js\\?v=${apiRevision}`));
    assert.match(APP_SOURCE, new RegExp(`services/weather-orchestrator\\.service\\.js\\?v=${apiRevision}`));
    assert.match(SEARCH_SOURCE, new RegExp(`services/geocoding\\.service\\.js\\?v=${apiRevision}`));
    assert.match(ORCHESTRATOR_SOURCE, new RegExp(`weather-provider\\.js\\?v=${apiRevision}`));
    assert.match(PROVIDER_SOURCE, new RegExp(`openmeteo\\.service\\.js\\?v=${apiRevision}`));
    assert.match(FORECAST_SOURCE, new RegExp(`air-quality\\.service\\.js\\?v=${apiRevision}`));
    assert.match(SW_SOURCE, /immersive-dashboard-p6f/);
});

function read(relativePath) {
    return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function htmlText(source) {
    return source
        .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
        .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}
