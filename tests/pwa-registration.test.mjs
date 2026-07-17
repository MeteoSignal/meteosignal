import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PWA_SOURCE = fs.readFileSync(path.join(ROOT, "pwa.js"), "utf8");

test("la premiere installation prend le controle sans recharger la page", async () => {
    const harness = createRegistrationHarness({ hasController: false });

    await harness.window.emit("load");
    await harness.serviceWorker.emit("controllerchange");

    assert.equal(harness.registerCalls.length, 1);
    assert.equal(harness.registerCalls[0][0], "./sw.js");
    assert.equal(harness.registerCalls[0][1].scope, "./");
    assert.equal(harness.registerCalls[0][1].updateViaCache, "none");
    assert.equal(harness.reloadCalls.length, 0);
    assert.equal(harness.updateCalls.length, 1);
});

test("un worker deja en attente est annonce une seule fois et sans rechargement", async () => {
    const harness = createRegistrationHarness({ hasController: true, waiting: {} });

    await harness.window.emit("load");
    await harness.registration.emit("updatefound");

    assert.equal(harness.liveStatus.textContent, harness.visibleStatus.textContent);
    assert.equal(harness.liveStatus.textContent, "Mise à jour installée. MeteoSignal va s’actualiser.");
    assert.equal(harness.liveStatus.assignments, 1);
    assert.equal(harness.visibleStatus.assignments, 1);
    assert.equal(harness.reloadCalls.length, 0);
});

test("une mise a jour nouvellement installee est annoncee puis ne recharge qu'une fois", async () => {
    const worker = createEventTarget({ state: "installing" });
    const harness = createRegistrationHarness({ hasController: true, installing: worker });

    await harness.window.emit("load");
    await harness.registration.emit("updatefound");
    worker.state = "installed";
    await worker.emit("statechange");
    await worker.emit("statechange");

    const nextWorker = createEventTarget({ state: "installing" });
    harness.registration.installing = nextWorker;
    await harness.registration.emit("updatefound");
    nextWorker.state = "installed";
    await nextWorker.emit("statechange");

    assert.equal(harness.liveStatus.textContent, "Mise à jour installée. MeteoSignal va s’actualiser.");
    assert.doesNotMatch(harness.liveStatus.textContent, /prochaine ouverture/);
    assert.equal(harness.liveStatus.assignments, 1);

    await harness.serviceWorker.emit("controllerchange");
    await harness.serviceWorker.emit("controllerchange");
    assert.equal(harness.reloadCalls.length, 1);
});

test("un echec de verification de mise a jour ne masque pas l'inscription reussie", async () => {
    const harness = createRegistrationHarness({ updateError: new Error("reseau") });

    await harness.window.emit("load");

    assert.equal(harness.registerCalls.length, 1);
    assert.equal(harness.warnings.length, 1);
    assert.match(harness.warnings[0][0], /Vérification de mise à jour/);
});

function createRegistrationHarness({
    hasController = true,
    waiting = null,
    installing = null,
    updateError = null
} = {}) {
    const registerCalls = [];
    const updateCalls = [];
    const reloadCalls = [];
    const warnings = [];
    const liveStatus = createTextElement();
    const visibleStatus = createTextElement();
    const registration = createEventTarget({
        waiting,
        installing,
        async update() {
            updateCalls.push(true);
            if (updateError) {
                throw updateError;
            }
        }
    });
    const serviceWorker = createEventTarget({
        controller: hasController ? {} : null,
        async register(...args) {
            registerCalls.push(args);
            return registration;
        }
    });
    const window = createEventTarget({
        location: { reload() { reloadCalls.push(true); } }
    });
    const document = {
        querySelector(selector) {
            if (selector === "#app-status") return liveStatus;
            if (selector === "#project-status-updated") return visibleStatus;
            return null;
        }
    };

    vm.runInContext(PWA_SOURCE, vm.createContext({
        navigator: { serviceWorker },
        window,
        document,
        console: { warn: (...args) => warnings.push(args) }
    }));

    return {
        window,
        serviceWorker,
        registration,
        liveStatus,
        visibleStatus,
        registerCalls,
        updateCalls,
        reloadCalls,
        warnings
    };
}

function createEventTarget(properties = {}) {
    const listeners = new Map();

    return Object.assign(properties, {
        addEventListener(type, listener) {
            const registered = listeners.get(type) ?? [];
            registered.push(listener);
            listeners.set(type, registered);
        },
        async emit(type) {
            await Promise.all((listeners.get(type) ?? []).map((listener) => listener()));
        }
    });
}

function createTextElement() {
    let value = "";
    let assignments = 0;

    return {
        get textContent() { return value; },
        set textContent(nextValue) {
            value = nextValue;
            assignments += 1;
        },
        get assignments() { return assignments; }
    };
}
