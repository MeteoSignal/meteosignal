const NAV_OPEN_ATTRIBUTE = "navOpen";
const NAV_COLLAPSED_ATTRIBUTE = "navCollapsed";

export function initNavigation() {
    const body = document.body;
    const toggleButton = document.querySelector("[data-nav-toggle]");
    const collapseButton = document.querySelector("[data-nav-collapse]");
    const overlay = document.querySelector("[data-nav-overlay]");
    const links = document.querySelectorAll("[data-nav-link]");

    if (!body) {
        return;
    }

    setMenuOpen(false, toggleButton);
    setNavigationCollapsed(false, collapseButton);

    toggleButton?.addEventListener("click", () => {
        const isOpen = body.dataset[NAV_OPEN_ATTRIBUTE] === "true";
        setMenuOpen(!isOpen, toggleButton);
    });

    overlay?.addEventListener("click", () => {
        setMenuOpen(false, toggleButton);
    });

    collapseButton?.addEventListener("click", () => {
        const isCollapsed = body.dataset[NAV_COLLAPSED_ATTRIBUTE] === "true";
        setNavigationCollapsed(!isCollapsed, collapseButton);
    });

    links.forEach((link) => {
        link.addEventListener("click", () => {
            setMenuOpen(false, toggleButton);
        });
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            setMenuOpen(false, toggleButton);
        }
    });
}

function setMenuOpen(isOpen, toggleButton) {
    document.body.dataset[NAV_OPEN_ATTRIBUTE] = String(isOpen);

    if (toggleButton) {
        toggleButton.setAttribute("aria-expanded", String(isOpen));
        toggleButton.setAttribute("aria-label", isOpen ? "Fermer le menu" : "Ouvrir le menu");
    }
}

function setNavigationCollapsed(isCollapsed, collapseButton) {
    document.body.dataset[NAV_COLLAPSED_ATTRIBUTE] = String(isCollapsed);

    if (!collapseButton) {
        return;
    }

    const label = collapseButton.querySelector(".nav-label");
    collapseButton.setAttribute("aria-pressed", String(isCollapsed));
    collapseButton.setAttribute(
        "aria-label",
        isCollapsed ? "Déplier la navigation" : "Réduire la navigation"
    );

    if (label) {
        label.textContent = isCollapsed ? "Déplier" : "Réduire";
    }
}
