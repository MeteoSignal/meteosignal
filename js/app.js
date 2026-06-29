console.log(`${CONFIG.appName} v${CONFIG.version} démarré`);

document.getElementById("version").textContent =
`${CONFIG.appName} • v${CONFIG.version} • Build ${CONFIG.build} • Développement actiff. Merci de suivre l'évolution du projet. • ${CONFIG.copyright}`;
