import { isFavoriteLocation, toggleFavoriteLocation } from "../core/storage.js";

const FAVORITE_BUTTON_SELECTOR = "#favorite-button";

export function initFavorites({ getActiveLocation, onToggle, onError } = {}) {
    const button = document.querySelector(FAVORITE_BUTTON_SELECTOR);

    if (!button) {
        return;
    }

    button.addEventListener("click", () => {
        const location = getActiveLocation?.();

        if (!location) {
            onError?.(new Error("Aucune ville active à ajouter aux favoris."));
            return;
        }

        const result = toggleFavoriteLocation(location);
        renderFavoriteButton(location);
        onToggle?.(result);
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
