(function registerMeteoSignalPwa() {
    if (!("serviceWorker" in navigator)) {
        return;
    }

    const hadControllerAtStartup = Boolean(navigator.serviceWorker.controller);
    let updateNoticeShown = false;
    let reloadStarted = false;

    function announceWaitingUpdate() {
        if (updateNoticeShown) {
            return;
        }

        updateNoticeShown = true;
        const message = "Nouvelle version disponible. Elle sera appliquée à la prochaine ouverture.";
        const liveStatus = document.querySelector("#app-status");
        const visibleStatus = document.querySelector("#project-status-updated");

        if (liveStatus) {
            liveStatus.textContent = message;
        }

        if (visibleStatus) {
            visibleStatus.textContent = message;
        }
    }

    function watchInstallingWorker(worker) {
        if (!worker) {
            return;
        }

        worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
                announceWaitingUpdate();
            }
        });
    }

    navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!hadControllerAtStartup || reloadStarted) {
            return;
        }

        reloadStarted = true;
        window.location.reload();
    });

    window.addEventListener("load", async () => {
        try {
            const registration = await navigator.serviceWorker.register("./sw.js", {
                scope: "./",
                updateViaCache: "none"
            });

            if (registration.waiting && navigator.serviceWorker.controller) {
                announceWaitingUpdate();
            }

            registration.addEventListener("updatefound", () => {
                watchInstallingWorker(registration.installing);
            });

            try {
                await registration.update();
            } catch (error) {
                console.warn("Vérification de mise à jour du service worker indisponible.", error);
            }
        } catch (error) {
            console.warn("Service worker indisponible.", error);
        }
    });
})();
