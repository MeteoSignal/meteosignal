console.log(`${CONFIG.appName} v${CONFIG.version} démarré`);

document.getElementById("version").textContent =
    `${CONFIG.appName} • v${CONFIG.version} • Build ${CONFIG.build} • ${CONFIG.copyright}`;
