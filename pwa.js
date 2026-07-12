(function registerMeteoSignalPwa() {
    if (!("serviceWorker" in navigator)) {
        return;
    }

    window.addEventListener("load", async () => {
        try {
            const registration = await navigator.serviceWorker.register("./sw.js", {
                scope: "./",
                updateViaCache: "none"
            });

            await registration.update();
        } catch (error) {
            console.warn("Service worker indisponible.", error);
        }
    });
})();
