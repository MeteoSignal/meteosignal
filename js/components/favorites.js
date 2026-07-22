import {
    getLocationKey,
    isFavoriteLocation,
    readFavorites,
    removeFavoriteLocation,
    toggleFavoriteLocation
} from "../core/storage.js?v=1.5.5-release";

const FAVORITE_BUTTON_SELECTOR = "#favorite-button";
const FAVORITES_LIST_SELECTOR = "[data-favorites-list]";
const FAVORITES_COUNT_SELECTOR = "[data-favorites-count]";
const FAVORITES_TOGGLE_SELECTOR = "[data-favorites-toggle]";
const FAVORITE_SELECT_SELECTOR = "[data-favorite-select]";
const FAVORITE_REMOVE_SELECTOR = "[data-favorite-remove]";
const initializedFavoritesDocuments = new WeakSet();

let favoriteOptions = {};

export function initFavorites(options = {}) {
    favoriteOptions = options;

    if (initializedFavoritesDocuments.has(document)) {
        return false;
    }

    initializedFavoritesDocuments.add(document);

    const button = document.querySelector(FAVORITE_BUTTON_SELECTOR);
    const list = document.querySelector(FAVORITES_LIST_SELECTOR);

    if (button) {
        button.addEventListener("click", () => {
            const location = favoriteOptions.getActiveLocation?.();

            if (!location) {
                favoriteOptions.onError?.(new Error("Aucune ville active à ajouter aux favoris."));
                return;
            }

            const wasFavorite = isFavoriteLocation(location);
            const result = toggleFavoriteLocation(location);
            renderFavoriteButton(location);
            renderFavoritesList(location);

            if (result.isFavorite !== wasFavorite) {
                favoriteOptions.onToggle?.({
                    ...result,
                    location
                });
            }
        });
    }

    list?.addEventListener("click", handleFavoritesListClick);

    renderFavoritesList(favoriteOptions.getActiveLocation?.());
    return true;
}

export function renderFavoritesList(activeLocation = null) {
    const list = document.querySelector(FAVORITES_LIST_SELECTOR);
    const count = document.querySelector(FAVORITES_COUNT_SELECTOR);

    if (!list) {
        return;
    }

    const favorites = readFavorites();
    const activeLocationKey = getLocationKey(activeLocation);

    if (count) {
        count.textContent = formatFavoritesCount(favorites.length);
        count.dataset.favoritesTotal = String(favorites.length);
    }

    renderFavoritesToggleLabel(favorites.length);

    list.innerHTML = "";

    if (favorites.length === 0) {
        list.removeAttribute("role");
        const empty = document.createElement("p");
        empty.className = "favorites-empty";
        empty.textContent = "Aucune ville enregistrée pour le moment.";
        list.appendChild(empty);
        return;
    }

    list.setAttribute("role", "list");
    favorites.forEach((favorite) => {
        list.appendChild(buildFavoriteItem(favorite, getLocationKey(favorite) === activeLocationKey));
    });
}

export function renderFavoriteButton(location) {
    const button = document.querySelector(FAVORITE_BUTTON_SELECTOR);

    if (!button || !location) {
        return;
    }

    const isFavorite = isFavoriteLocation(location);
    button.classList.toggle("is-active", isFavorite);
    button.dataset.favoriteState = isFavorite ? "active" : "idle";
    button.setAttribute("aria-pressed", String(isFavorite));
    button.setAttribute(
        "aria-label",
        isFavorite ? "Retirer cette ville des favoris" : "Ajouter cette ville aux favoris"
    );
}

async function handleFavoritesListClick(event) {
    const target = event.target instanceof Element ? event.target : null;

    if (!target) {
        return;
    }

    const removeButton = target.closest(FAVORITE_REMOVE_SELECTOR);
    const selectButton = target.closest(FAVORITE_SELECT_SELECTOR);

    if (removeButton) {
        const sourceList = removeButton.closest(FAVORITES_LIST_SELECTOR);
        const removedIndex = sourceList
            ? Array.from(sourceList.querySelectorAll(FAVORITE_REMOVE_SELECTOR)).indexOf(removeButton)
            : -1;
        const location = getFavoriteByKey(removeButton.dataset.favoriteKey);

        if (!location) {
            return;
        }

        const favorites = removeFavoriteLocation(location);
        const activeLocation = favoriteOptions.getActiveLocation?.();
        renderFavoriteButton(activeLocation);
        renderFavoritesList(activeLocation);
        favoriteOptions.onRemove?.({
            location,
            favorites,
            removedActiveLocation: getLocationKey(location) === getLocationKey(activeLocation)
        });
        restoreFavoriteFocus({
            sourceList,
            removedIndex,
            remainingCount: favorites.length
        });
        return;
    }

    if (selectButton) {
        const location = getFavoriteByKey(selectButton.dataset.favoriteKey);

        if (!location) {
            return;
        }

        try {
            await favoriteOptions.onLocationSelect?.(location);
        } catch (error) {
            favoriteOptions.onError?.(error);
        }
    }
}

export function getFavoriteFocusIndex(removedIndex, remainingCount) {
    if (!Number.isInteger(removedIndex) || removedIndex < 0 || remainingCount <= 0) {
        return -1;
    }

    return Math.min(removedIndex, remainingCount - 1);
}

export function restoreFavoriteFocus({ sourceList, removedIndex, remainingCount }) {
    const targetIndex = getFavoriteFocusIndex(removedIndex, remainingCount);

    if (sourceList?.isConnected && targetIndex >= 0) {
        const removeButtons = sourceList.querySelectorAll(FAVORITE_REMOVE_SELECTOR);

        if (focusFavoriteControl(removeButtons[targetIndex])) {
            return removeButtons[targetIndex];
        }
    }

    const fallbackControls = [
        document.querySelector(FAVORITE_BUTTON_SELECTOR),
        document.querySelector(FAVORITES_TOGGLE_SELECTOR)
    ];

    return fallbackControls.find((control) => focusFavoriteControl(control)) ?? null;
}

function focusFavoriteControl(control) {
    if (!isAvailableFocusTarget(control)) {
        return false;
    }

    try {
        control.focus({ preventScroll: true });
    } catch {
        try {
            control.focus();
        } catch {
            return false;
        }
    }

    return document.activeElement === control && isAvailableFocusTarget(control);
}

function isAvailableFocusTarget(control) {
    if (!control?.isConnected || control.disabled || typeof control.focus !== "function") {
        return false;
    }

    let current = control;

    while (current) {
        if (current.hidden) {
            return false;
        }

        if (typeof window !== "undefined" && typeof window.getComputedStyle === "function") {
            const style = window.getComputedStyle(current);

            if (style.display === "none" || style.visibility === "hidden") {
                return false;
            }
        }

        current = current.parentElement;
    }

    return true;
}

function buildFavoriteItem(location, isActive) {
    const item = document.createElement("div");
    const locationKey = getLocationKey(location);
    item.className = "favorite-item";
    item.dataset.favoriteKey = locationKey;
    item.setAttribute("role", "listitem");

    if (isActive) {
        item.dataset.favoriteActive = "true";
    }

    const selectButton = document.createElement("button");
    selectButton.className = "favorite-select";
    selectButton.type = "button";
    selectButton.dataset.favoriteSelect = "true";
    selectButton.dataset.favoriteKey = locationKey;
    selectButton.setAttribute("aria-label", `Afficher la météo de ${location.label ?? location.name}`);
    selectButton.setAttribute("aria-pressed", String(isActive));

    const name = document.createElement("span");
    name.className = "favorite-name";
    name.textContent = location.name;

    const meta = document.createElement("span");
    meta.className = "favorite-meta";
    meta.textContent = formatFavoriteMeta(location);

    const removeButton = document.createElement("button");
    removeButton.className = "favorite-remove";
    removeButton.type = "button";
    removeButton.dataset.favoriteRemove = "true";
    removeButton.dataset.favoriteKey = locationKey;
    removeButton.setAttribute("aria-label", `Supprimer ${location.name} des villes enregistrées`);
    removeButton.innerHTML = '<span aria-hidden="true">×</span>';

    selectButton.appendChild(name);
    selectButton.appendChild(meta);
    item.appendChild(selectButton);
    item.appendChild(removeButton);

    return item;
}

function getFavoriteByKey(locationKey) {
    return readFavorites().find((favorite) => getLocationKey(favorite) === locationKey) ?? null;
}

function formatFavoritesCount(count) {
    return count <= 1 ? `${count} ville` : `${count} villes`;
}

function renderFavoritesToggleLabel(count) {
    const toggle = document.querySelector(FAVORITES_TOGGLE_SELECTOR);

    if (!toggle) {
        return;
    }

    const countLabel = count === 0
        ? "aucune ville enregistrée"
        : `${formatFavoritesCount(count)} enregistrée${count > 1 ? "s" : ""}`;
    toggle.setAttribute("aria-label", `Accès rapide, ${countLabel}`);
}

function formatFavoriteMeta(location) {
    return [location.admin1, location.country]
        .filter(Boolean)
        .join(", ") || location.label || "Ville enregistrée";
}
