function updateClock() {
    const now = new Date();

    const heure = now.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit"
    });

    document.getElementById("clock").textContent = heure;
}

// Mise à jour immédiate
updateClock();

// Puis toutes les secondes
setInterval(updateClock, 1000);
