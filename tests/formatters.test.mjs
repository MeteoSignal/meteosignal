import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

import { formatForecastDay, formatTime } from "../js/core/formatters.js";

const formatterModuleUrl = new URL("../js/core/formatters.js", import.meta.url).href;

test("une date quotidienne reste le meme jour dans les fuseaux negatifs", () => {
    for (const timezone of ["Europe/Paris", "America/New_York", "Pacific/Honolulu"]) {
        const output = execFileSync(process.execPath, [
            "--input-type=module",
            "--eval",
            `import { formatForecastDay } from ${JSON.stringify(formatterModuleUrl)}; process.stdout.write(formatForecastDay("2026-07-12"));`
        ], {
            encoding: "utf8",
            env: { ...process.env, TZ: timezone }
        });

        assert.equal(output, "dim. 12", timezone);
    }
});

test("les dates invalides ne provoquent pas de RangeError", () => {
    assert.equal(formatForecastDay("2026-02-30"), "--");
    assert.equal(formatForecastDay("date-invalide"), "--");
    assert.equal(formatTime("date-invalide"), "--:--");
});
