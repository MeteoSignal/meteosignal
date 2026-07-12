import test from "node:test";
import assert from "node:assert/strict";

import { formatHourlyTime } from "../js/components/hourly-forecast.js";

const firstRange = { index: 0 };

test("Maintenant est reserve a une donnee explicitement courante", () => {
    assert.equal(formatHourlyTime({ time: "2026-07-10T09:00", isCurrent: true }, 0, firstRange), "Maintenant");
    assert.equal(formatHourlyTime({ time: "2026-07-10T10:00", isCurrent: false }, 0, firstRange), "10:00");
});
