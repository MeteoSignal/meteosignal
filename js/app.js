console.log(`${CONFIG.appName} v${CONFIG.version} démarré`);

document.getElementById("version").textContent =
`${CONFIG.appName} • v${CONFIG.version} • Build ${CONFIG.build} • Développement actif. Merci de suivre l'évolution du projet. • ${CONFIG.copyright}`;
