function formatClockTime(date) {
    return date.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit"
    });
}

function millisecondsUntilNextMinute(date) {
    return 60000 - ((date.getSeconds() * 1000) + date.getMilliseconds());
}

function createMinuteAlignedClock({
    now = () => new Date(),
    setTimer = (callback, delay) => setTimeout(callback, delay),
    clearTimer = (timerId) => clearTimeout(timerId),
    render
}) {
    if (typeof render !== "function") {
        throw new TypeError("L'horloge nécessite une fonction de rendu.");
    }

    let timerId = null;

    function scheduleNextTick(date) {
        timerId = setTimer(tick, millisecondsUntilNextMinute(date));
    }

    function tick() {
        timerId = null;
        const currentTime = now();
        render(currentTime);
        scheduleNextTick(currentTime);
    }

    function start() {
        stop();
        tick();
    }

    function stop() {
        if (timerId !== null) {
            clearTimer(timerId);
            timerId = null;
        }
    }

    return Object.freeze({ start, stop });
}

if (typeof document !== "undefined") {
    const clock = createMinuteAlignedClock({
        render(date) {
            const clockElement = document.getElementById("clock");

            if (clockElement) {
                clockElement.textContent = formatClockTime(date);
            }
        }
    });
    clock.start();
}
