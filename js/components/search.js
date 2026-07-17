import {
    createLocationSearchPlan,
    createSearchRequestGuard,
    getAutomaticLocationSelection,
    getLocationTypeLabel,
    getNextSuggestionIndex,
    LOCATION_SEARCH_LIMIT_MESSAGE,
    validateLocationSearchQuery
} from "../core/location-search.js?v=1.5.1-release";
import { searchLocations } from "../services/geocoding.service.js?v=1.5.1-release";

const SEARCH_FORM_SELECTOR = "[data-search-form]";
const SEARCH_INPUT_SELECTOR = "#city-search";
const SEARCH_STATUS_SELECTOR = "#search-status";
const SEARCH_SUGGESTIONS_SELECTOR = "[data-search-suggestions]";
const SEARCH_DEBOUNCE_MS = 300;

let searchRuntime = null;

export function initSearch({ onLocationSelect, onError, searchLocationsImpl = searchLocations } = {}) {
    const form = document.querySelector(SEARCH_FORM_SELECTOR);
    const input = document.querySelector(SEARCH_INPUT_SELECTOR);
    const suggestions = document.querySelector(SEARCH_SUGGESTIONS_SELECTOR);

    if (!form || !input || !suggestions) {
        return;
    }

    searchRuntime = createSearchRuntime({
        form,
        input,
        suggestions,
        onLocationSelect,
        onError,
        searchLocations: searchLocationsImpl
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        await submitSearch(searchRuntime);
    });

    input.addEventListener("beforeinput", (event) => handleSearchBeforeInput(event, searchRuntime));
    input.addEventListener("paste", (event) => handleSearchPaste(event, searchRuntime));
    input.addEventListener("input", () => handleSearchInput(searchRuntime));
    input.addEventListener("keydown", (event) => handleSearchKeydown(event, searchRuntime));
    suggestions.addEventListener("mousedown", (event) => event.preventDefault());
    suggestions.addEventListener("click", async (event) => {
        const option = event.target instanceof Element
            ? event.target.closest("[data-search-option]")
            : null;

        if (!option) {
            return;
        }

        const index = Number(option.dataset.searchOption);
        const location = searchRuntime.results[index];

        if (location) {
            await selectLocation(location, searchRuntime);
        }
    });

    document.addEventListener("pointerdown", (event) => {
        if (event.target instanceof Node && !form.contains(event.target)) {
            closeSuggestions(searchRuntime);
        }
    });

    setSearchState(form, "idle");
}

export function updateSearchInput(location) {
    const input = document.querySelector(SEARCH_INPUT_SELECTOR);

    if (input && location) {
        cancelPendingSearch(searchRuntime);
        closeSuggestions(searchRuntime);
        input.value = location.label ?? location.name ?? "";
    }
}

function createSearchRuntime(options) {
    return {
        ...options,
        results: [],
        query: "",
        plan: null,
        activeIndex: -1,
        debounceId: null,
        controller: null,
        requestGuard: createSearchRequestGuard()
    };
}

function handleSearchInput(runtime) {
    const validation = validateLocationSearchQuery(runtime.input.value);

    runtime.input.setCustomValidity("");
    cancelPendingSearch(runtime);
    closeSuggestions(runtime);

    if (validation.isTooLong) {
        rejectExcessiveSearch(runtime);
        return;
    }

    if (validation.isTooShort) {
        setSearchStatus("");
        return;
    }

    runtime.debounceId = setTimeout(() => {
        performSearch(validation.query, "input", runtime);
    }, SEARCH_DEBOUNCE_MS);
}

function handleSearchBeforeInput(event, runtime) {
    if (!event.inputType?.startsWith("insert") || typeof event.data !== "string") {
        return;
    }

    if (validateLocationSearchQuery(getValueAfterInsertion(runtime.input, event.data)).isTooLong) {
        event.preventDefault();
        rejectExcessiveSearch(runtime);
    }
}

function handleSearchPaste(event, runtime) {
    const pastedText = event.clipboardData?.getData("text/plain");

    if (
        typeof pastedText === "string"
        && validateLocationSearchQuery(getValueAfterInsertion(runtime.input, pastedText)).isTooLong
    ) {
        event.preventDefault();
        rejectExcessiveSearch(runtime);
    }
}

function getValueAfterInsertion(input, insertedText) {
    const selectionStart = Number.isInteger(input.selectionStart)
        ? input.selectionStart
        : input.value.length;
    const selectionEnd = Number.isInteger(input.selectionEnd)
        ? input.selectionEnd
        : selectionStart;

    return `${input.value.slice(0, selectionStart)}${insertedText}${input.value.slice(selectionEnd)}`;
}

function handleSearchKeydown(event, runtime) {
    if (event.key === "Escape") {
        cancelPendingSearch(runtime);
        closeSuggestions(runtime);
        setSearchStatus("Propositions fermées.");
        return;
    }

    if (!runtime.results.length || runtime.suggestions.hidden) {
        return;
    }

    if (event.key === "Enter") {
        event.preventDefault();

        if (runtime.activeIndex >= 0) {
            void selectLocation(runtime.results[runtime.activeIndex], runtime);
        } else {
            void submitSearch(runtime);
        }

        return;
    }

    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
        return;
    }

    event.preventDefault();
    runtime.activeIndex = getNextSuggestionIndex(
        runtime.activeIndex,
        event.key,
        runtime.results.length
    );
    updateActiveSuggestion(runtime);
}

async function submitSearch(runtime) {
    const validation = validateLocationSearchQuery(runtime.input.value);

    if (validation.isTooLong) {
        rejectExcessiveSearch(runtime);
        return;
    }

    if (validation.isTooShort) {
        reportInputError(runtime.input, "Saisis au moins deux caractères.");
        return;
    }

    const query = validation.query;

    clearTimeout(runtime.debounceId);
    runtime.debounceId = null;

    if (runtime.query === query && runtime.results.length > 0) {
        if (runtime.activeIndex >= 0) {
            await selectLocation(runtime.results[runtime.activeIndex], runtime);
            return;
        }

        const automaticLocation = getAutomaticLocationSelection(
            runtime.results,
            runtime.plan,
            "submit"
        );

        if (automaticLocation) {
            await selectLocation(automaticLocation, runtime);
            return;
        }

        openSuggestions(runtime);
        setSearchStatus("Plusieurs lieux correspondent. Choisis une proposition.");
        return;
    }

    await performSearch(query, "submit", runtime);
}

function rejectExcessiveSearch(runtime) {
    cancelPendingSearch(runtime);
    closeSuggestions(runtime);
    reportInputError(runtime.input, LOCATION_SEARCH_LIMIT_MESSAGE);
}

async function performSearch(query, intent, runtime) {
    cancelPendingSearch(runtime);

    const controller = new AbortController();
    const requestId = runtime.requestGuard.next();
    runtime.controller = controller;
    setSearchState(runtime.form, "loading");
    setSearchStatus("Recherche en cours.");

    try {
        const plan = createLocationSearchPlan(query);
        const results = await runtime.searchLocations(query, { signal: controller.signal });

        if (
            !runtime.requestGuard.isCurrent(requestId)
            || validateLocationSearchQuery(runtime.input.value).query !== query
        ) {
            return;
        }

        runtime.query = query;
        runtime.plan = plan;
        runtime.results = results;
        runtime.activeIndex = -1;

        if (results.length === 0) {
            closeSuggestions(runtime);

            if (intent === "submit") {
                reportInputError(runtime.input, "Aucun lieu trouvé.");
            } else {
                setSearchStatus("Aucun lieu trouvé.");
            }
            return;
        }

        renderSuggestions(runtime);

        const automaticLocation = getAutomaticLocationSelection(results, plan, intent);

        if (automaticLocation) {
            await selectLocation(automaticLocation, runtime);
            return;
        }

        const suffix = results.length > 1 ? "s" : "";
        setSearchStatus(`${results.length} proposition${suffix}. Choisis un lieu.`);
    } catch (error) {
        if (isAbortError(error) || !runtime.requestGuard.isCurrent(requestId)) {
            return;
        }

        closeSuggestions(runtime);

        if (intent === "submit") {
            reportInputError(runtime.input, "Recherche indisponible.");
            runtime.onError?.(error);
        } else {
            setSearchStatus("Recherche momentanément indisponible.");
        }
    } finally {
        if (runtime.requestGuard.isCurrent(requestId)) {
            runtime.controller = null;
            setSearchState(runtime.form, "idle");
        }
    }
}

async function selectLocation(location, runtime) {
    cancelPendingSearch(runtime);
    closeSuggestions(runtime);
    runtime.input.setCustomValidity("");
    runtime.input.value = location.label ?? location.name;

    try {
        setSearchState(runtime.form, "selecting");
        await runtime.onLocationSelect?.(location);
        setSearchStatus(`${location.label ?? location.name} sélectionnée.`);
    } catch (error) {
        reportInputError(runtime.input, "Impossible de charger ce lieu.");
        runtime.onError?.(error);
    } finally {
        setSearchState(runtime.form, "idle");
    }
}

function renderSuggestions(runtime) {
    runtime.suggestions.innerHTML = "";

    runtime.results.forEach((location, index) => {
        const option = document.createElement("li");
        option.id = `city-search-option-${index}`;
        option.className = "search-suggestion";
        option.dataset.searchOption = String(index);
        option.setAttribute("role", "option");
        option.setAttribute("aria-selected", "false");

        const content = document.createElement("span");
        content.className = "search-suggestion-content";

        const name = document.createElement("strong");
        name.textContent = location.name;

        const meta = document.createElement("small");
        meta.textContent = formatSuggestionMeta(location);

        const type = document.createElement("span");
        type.className = "search-suggestion-type";
        type.textContent = getLocationTypeLabel(location);

        content.appendChild(name);
        content.appendChild(meta);
        option.appendChild(content);
        option.appendChild(type);
        runtime.suggestions.appendChild(option);
    });

    openSuggestions(runtime);
    updateActiveSuggestion(runtime);
}

function formatSuggestionMeta(location) {
    const postcode = Array.isArray(location.postcodes) ? location.postcodes[0] : null;
    return [location.admin1, location.country, postcode]
        .filter(Boolean)
        .join(" · ") || "Localisation disponible";
}

function updateActiveSuggestion(runtime) {
    const options = runtime.suggestions.querySelectorAll("[data-search-option]");

    options.forEach((option, index) => {
        option.setAttribute("aria-selected", String(index === runtime.activeIndex));
    });

    const activeOption = options[runtime.activeIndex];

    if (activeOption) {
        runtime.input.setAttribute("aria-activedescendant", activeOption.id);
        activeOption.scrollIntoView({ block: "nearest" });
    } else {
        runtime.input.removeAttribute("aria-activedescendant");
    }
}

function openSuggestions(runtime) {
    if (!runtime || runtime.results.length === 0) {
        return;
    }

    runtime.suggestions.hidden = false;
    runtime.input.setAttribute("aria-expanded", "true");
}

function closeSuggestions(runtime) {
    if (!runtime) {
        return;
    }

    runtime.activeIndex = -1;
    runtime.suggestions.hidden = true;
    runtime.input.setAttribute("aria-expanded", "false");
    runtime.input.removeAttribute("aria-activedescendant");
}

function cancelPendingSearch(runtime) {
    if (!runtime) {
        return;
    }

    clearTimeout(runtime.debounceId);
    runtime.debounceId = null;
    runtime.controller?.abort();
    runtime.controller = null;
    runtime.requestGuard.invalidate();
    setSearchState(runtime.form, "idle");
}

function reportInputError(input, message) {
    input.setCustomValidity(message);
    input.reportValidity();
    setSearchStatus(message);
}

function setSearchState(form, state) {
    form.dataset.searchState = state;
    form.setAttribute("aria-busy", state === "loading" ? "true" : "false");
}

function setSearchStatus(message) {
    const status = document.querySelector(SEARCH_STATUS_SELECTOR);

    if (status) {
        status.textContent = message;
    }
}

function isAbortError(error) {
    return error?.name === "AbortError" || error?.code === "ABORT_ERR";
}
