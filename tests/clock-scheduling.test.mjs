import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLOCK_SOURCE = fs.readFileSync(path.join(ROOT, "js", "clock.js"), "utf8");

test("l'horloge rend immédiatement puis s'aligne sur la prochaine minute", () => {
    const harness = createClockHarness("2026-07-12T12:34:45.250Z");

    harness.clock.start();

    assert.deepEqual(harness.rendered, ["2026-07-12T12:34:45.250Z"]);
    assert.deepEqual(harness.delays, [14750]);
    assert.equal(harness.activeTimers.size, 1);
    assert.equal(harness.delays.includes(1000), false);
});

test("un réveil à la minute rend une fois et programme la minute suivante", () => {
    const harness = createClockHarness("2026-07-12T12:34:45.250Z");
    harness.clock.start();

    harness.fireNextTimerAt("2026-07-12T12:35:00.000Z");

    assert.deepEqual(harness.rendered, [
        "2026-07-12T12:34:45.250Z",
        "2026-07-12T12:35:00.000Z"
    ]);
    assert.deepEqual(harness.delays, [14750, 60000]);
    assert.equal(harness.activeTimers.size, 1);
});

test("un timer retardé se resynchronise sur la minute réelle suivante", () => {
    const harness = createClockHarness("2026-07-12T12:34:45.250Z");
    harness.clock.start();

    harness.fireNextTimerAt("2026-07-12T12:37:23.400Z");

    assert.equal(harness.rendered.at(-1), "2026-07-12T12:37:23.400Z");
    assert.equal(harness.delays.at(-1), 36600);
    assert.equal(harness.activeTimers.size, 1);
});

test("plusieurs démarrages conservent un seul timer actif", () => {
    const harness = createClockHarness("2026-07-12T12:34:45.250Z");

    harness.clock.start();
    harness.clock.start();

    assert.equal(harness.activeTimers.size, 1);
    assert.equal(harness.clearedTimers.length, 1);
});

test("le format français heures-minutes reste inchangé", () => {
    const { api } = createClockApi();
    const date = new Date(2026, 6, 12, 9, 5, 42);

    assert.equal(api.formatClockTime(date), "09:05");
});

function createClockHarness(initialTime) {
    const { api } = createClockApi();
    let currentTime = new Date(initialTime);
    let nextTimerId = 1;
    const rendered = [];
    const delays = [];
    const clearedTimers = [];
    const activeTimers = new Map();
    const clock = api.createMinuteAlignedClock({
        now: () => new Date(currentTime.getTime()),
        setTimer(callback, delay) {
            const timerId = nextTimerId;
            nextTimerId += 1;
            delays.push(delay);
            activeTimers.set(timerId, callback);
            return timerId;
        },
        clearTimer(timerId) {
            clearedTimers.push(timerId);
            activeTimers.delete(timerId);
        },
        render: (date) => rendered.push(date.toISOString())
    });

    return {
        clock,
        rendered,
        delays,
        clearedTimers,
        activeTimers,
        fireNextTimerAt(time) {
            currentTime = new Date(time);
            const [timerId, callback] = activeTimers.entries().next().value;
            activeTimers.delete(timerId);
            callback();
        }
    };
}

function createClockApi() {
    const context = vm.createContext({});
    vm.runInContext(`${CLOCK_SOURCE}\n;globalThis.__clockTest = {
        formatClockTime,
        millisecondsUntilNextMinute,
        createMinuteAlignedClock
    };`, context);
    return { api: context.__clockTest };
}
