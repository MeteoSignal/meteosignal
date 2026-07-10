import { searchLocations } from "../services/geocoding.service.js?v=1.4.0-multi-api-foundation";

const SEARCH_FORM_SELECTOR = "[data-search-form]";
const SEARCH_INPUT_SELECTOR = "#city-search";
const SEARCH_STATUS_SELECTOR = "#search-status";

export function initSearch({ onLocationSelect, onError } = {}) {
    const form = document.querySelector(SEARCH_FORM_SELECTOR);
    const input = document.querySelector(SEARCH_INPUT_SELECTOR);

    if (!form || !input) {
        return;
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        await submitSearch({ form, input, onLocationSelect, onError });
    });

    setSearchState(form, "idle");

    input.addEventListener("input", () => {
        input.setCustomValidity("");
        setSearchStatus("");
    });
}

export function updateSearchInput(location) {
    const input = document.querySelector(SEARCH_INPUT_SELECTOR);

    if (input && location) {
        input.value = location.label ?? location.name ?? "";
    }
}

async function submitSearch({ form, input, onLocationSelect, onError }) {
    const query = input.value.trim();

    if (query.length < 2) {
        reportInputError(input, "Saisis au moins deux caractères.");
        return;
    }

    try {
        setSearchState(form, "loading");
        setSearchStatus("Recherche en cours.");

        const results = await searchLocations(query);
        const selectedLocation = results[0];

        if (!selectedLocation) {
            reportInputError(input, "Aucune ville trouvée.");
            return;
        }

        input.setCustomValidity("");
        input.value = selectedLocation.label;
        await onLocationSelect?.(selectedLocation);
        setSearchStatus(`${selectedLocation.label} sélectionnée.`);
    } catch (error) {
        reportInputError(input, "Recherche indisponible.");
        onError?.(error);
    } finally {
        setSearchState(form, "idle");
    }
}

function reportInputError(input, message) {
    input.setCustomValidity(message);
    input.reportValidity();
    setSearchStatus(message);
}

function setSearchState(form, state) {
    form.dataset.searchState = state;
    form.setAttribute("aria-busy", state === "loading" ? "true" : "false");

    const submitButton = form.querySelector("button[type='submit']");

    if (submitButton) {
        submitButton.disabled = state === "loading";
    }
}

function setSearchStatus(message) {
    const status = document.querySelector(SEARCH_STATUS_SELECTOR);

    if (status) {
        status.textContent = message;
    }
}
