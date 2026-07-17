const NAV_OPEN_ATTRIBUTE = "navOpen";
const NAV_COLLAPSED_ATTRIBUTE = "navCollapsed";
const initializedNavigationDocuments = new WeakSet();

export function initNavigation() {
    const body = document.body;

    if (!body || initializedNavigationDocuments.has(document)) {
        return false;
    }

    initializedNavigationDocuments.add(document);

    const toggleButton = document.querySelector("[data-nav-toggle]");
    const collapseButton = document.querySelector("[data-nav-collapse]");
    const overlay = document.querySelector("[data-nav-overlay]");
    const links = document.querySelectorAll("[data-nav-link]");
    const mobileLinks = document.querySelectorAll("[data-mobile-nav-link]");
    let favoritesController = null;
    const updateNavigationCollapsed = (isCollapsed) => {
        setNavigationCollapsed(isCollapsed, collapseButton);

        favoritesController?.close({ restoreFocus: isCollapsed });
    };

    favoritesController = initFavoritesPanelNavigation();

    setMenuOpen(false, toggleButton);
    updateNavigationCollapsed(false);

    toggleButton?.addEventListener("click", () => {
        const isOpen = body.dataset[NAV_OPEN_ATTRIBUTE] === "true";
        setMenuOpen(!isOpen, toggleButton);
    });

    overlay?.addEventListener("click", () => {
        setMenuOpen(false, toggleButton);
    });

    collapseButton?.addEventListener("click", () => {
        const isCollapsed = body.dataset[NAV_COLLAPSED_ATTRIBUTE] === "true";
        updateNavigationCollapsed(!isCollapsed);
    });

    links.forEach((link) => {
        link.addEventListener("click", () => {
            setMenuOpen(false, toggleButton);
        });
    });

    initMobileNavigationState(mobileLinks);

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            setMenuOpen(false, toggleButton);
            favoritesController?.close({ restoreFocus: true });
        }
    });

    return true;
}

function initFavoritesPanelNavigation() {
    const panel = document.querySelector("[data-favorites-panel]");
    const toggleButton = document.querySelector("[data-favorites-toggle]");
    const closeButton = document.querySelector("[data-favorites-close]");

    if (!panel || !toggleButton || !closeButton) {
        return null;
    }

    const setExpanded = (isExpanded, options) => {
        setFavoritesPanelExpanded(toggleButton, panel, isExpanded, options);
    };

    setExpanded(toggleButton.getAttribute("aria-expanded") === "true" && !panel.hidden);

    toggleButton.addEventListener("click", () => {
        const shouldExpand = toggleButton.getAttribute("aria-expanded") !== "true";
        setExpanded(shouldExpand);
    });

    closeButton.addEventListener("click", () => setExpanded(false, { restoreFocus: true }));

    panel.addEventListener("click", (event) => {
        const target = event.target;

        if (typeof target?.closest === "function" && target.closest("[data-favorite-select]")) {
            setExpanded(false, { restoreFocus: true });
        }
    });

    document.addEventListener("pointerdown", (event) => {
        const target = event.target;

        if (toggleButton.getAttribute("aria-expanded") === "true"
            && target
            && !panel.contains(target)
            && !toggleButton.contains(target)) {
            setExpanded(false);
        }
    });

    return {
        close: (options) => setExpanded(false, options)
    };
}

export function setFavoritesPanelExpanded(toggleButton, panel, isExpanded, { restoreFocus = false } = {}) {
    if (!toggleButton || !panel) {
        return;
    }

    const wasExpanded = toggleButton.getAttribute("aria-expanded") === "true" && !panel.hidden;
    const shouldRestoreFocus = !isExpanded && restoreFocus && wasExpanded;

    toggleButton.setAttribute("aria-expanded", String(isExpanded));
    panel.hidden = !isExpanded;

    if (shouldRestoreFocus) {
        focusWithoutScroll(toggleButton);
    }
}

function focusWithoutScroll(control) {
    try {
        control.focus({ preventScroll: true });
    } catch {
        control.focus();
    }
}

function setMenuOpen(isOpen, toggleButton) {
    document.body.dataset[NAV_OPEN_ATTRIBUTE] = String(isOpen);

    if (toggleButton) {
        toggleButton.setAttribute("aria-expanded", String(isOpen));
        toggleButton.setAttribute("aria-label", isOpen ? "Fermer le menu" : "Ouvrir le menu");
    }
}

function initMobileNavigationState(links) {
    if (links.length === 0) {
        return;
    }

    const sections = Array.from(links)
        .map((link) => ({
            hash: getLinkHash(link),
            element: document.querySelector(getLinkHash(link))
        }))
        .filter((item) => item.hash && item.element);

    setActiveMobileLink(links, window.location.hash || "#contenu");

    links.forEach((link) => {
        link.addEventListener("click", () => {
            setActiveMobileLink(links, getLinkHash(link));
        });
    });

    window.addEventListener("hashchange", () => {
        setActiveMobileLink(links, window.location.hash || "#contenu");
    });

    if (sections.length === 0) {
        return;
    }

    let scrollFrame = null;
    const updateFromScroll = () => {
        scrollFrame = null;
        setActiveMobileLink(links, getCurrentSectionHash(sections));
    };
    const scrollContainer = document.querySelector(".app-shell");
    const scrollSources = scrollContainer ? [window, scrollContainer] : [window];

    scrollSources.forEach((source) => {
        source.addEventListener("scroll", () => {
            if (scrollFrame !== null) {
                return;
            }

            scrollFrame = window.requestAnimationFrame(updateFromScroll);
        }, { passive: true });
    });

    window.setTimeout(updateFromScroll, 250);
}

function getLinkHash(link) {
    try {
        return new URL(link.href).hash;
    } catch (error) {
        return link.getAttribute("href") ?? "";
    }
}

function setActiveMobileLink(links, activeHash) {
    const normalizedHash = activeHash || "#contenu";

    links.forEach((link) => {
        const isActive = getLinkHash(link) === normalizedHash;
        link.classList.toggle("is-active", isActive);

        if (isActive) {
            link.setAttribute("aria-current", "location");
        } else {
            link.removeAttribute("aria-current");
        }
    });
}

function getCurrentSectionHash(sections) {
    const checkpoint = Math.min(180, window.innerHeight * 0.28);
    let currentHash = sections[0]?.hash ?? "#contenu";

    sections.forEach(({ hash, element }) => {
        const bounds = element.getBoundingClientRect();

        if (bounds.top <= checkpoint) {
            currentHash = hash;
        }
    });

    return currentHash;
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
