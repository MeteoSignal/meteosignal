const STORAGE_KEY = "meteosignal:privacy-return-context";
const CONTEXT_MAX_AGE_MS = 5 * 60 * 1000;
const PRIVACY_LINK_ID = "privacy-footer-link";
const RETURN_LINK_SELECTOR = "[data-privacy-return]";

export function initPrivacyReturn({
    documentRef = globalThis.document,
    windowRef = globalThis.window,
    storageRef,
    now = () => Date.now(),
    schedule = (callback) => windowRef.requestAnimationFrame(() => windowRef.requestAnimationFrame(callback))
} = {}) {
    if (!documentRef || !windowRef) {
        return Object.freeze({ destroy() {} });
    }

    const storage = storageRef ?? getSessionStorage(windowRef);
    const privacyLink = documentRef.getElementById(PRIVACY_LINK_ID);
    const returnLinks = Array.from(documentRef.querySelectorAll(RETURN_LINK_SELECTOR));
    const cleanups = [];

    if (privacyLink) {
        const handlePrivacyOpen = (event) => {
            if (!isPlainPrimaryActivation(event, privacyLink, windowRef.location.href)) {
                return;
            }

            writePrivacyReturnContext(storage, createPrivacyReturnContext({
                returnUrl: windowRef.location.href,
                origin: windowRef.location.origin,
                focusId: PRIVACY_LINK_ID,
                scroll: captureScrollPosition(documentRef, windowRef),
                timestamp: now()
            }));
        };

        privacyLink.addEventListener("click", handlePrivacyOpen);
        cleanups.push(() => privacyLink.removeEventListener("click", handlePrivacyOpen));
    }

    returnLinks.forEach((link) => {
        const handleReturn = (event) => {
            if (!isPlainPrimaryActivation(event, link, windowRef.location.href)) {
                return;
            }

            const context = readPrivacyReturnContext(storage, {
                origin: windowRef.location.origin,
                now: now()
            });

            if (!context) {
                return;
            }

            event.preventDefault();

            const method = getSafeReturnMethod(context, {
                origin: windowRef.location.origin,
                referrer: documentRef.referrer,
                historyLength: windowRef.history.length
            });

            if (method === "history") {
                windowRef.history.back();
            } else {
                windowRef.location.assign(context.returnPath);
            }
        };

        link.addEventListener("click", handleReturn);
        cleanups.push(() => link.removeEventListener("click", handleReturn));
    });

    let restorationPending = false;
    const handlePageShow = (event) => {
        if (restorationPending) {
            return;
        }

        const context = readPrivacyReturnContext(storage, {
            origin: windowRef.location.origin,
            now: now()
        });

        if (!context || getRelativeUrl(windowRef.location.href, windowRef.location.origin) !== context.returnPath) {
            return;
        }

        restorationPending = true;
        const navigationType = windowRef.performance
            ?.getEntriesByType?.("navigation")
            ?.[0]
            ?.type;
        const useNativeScroll = Boolean(event.persisted || navigationType === "back_forward");

        schedule(() => {
            restorePrivacyReturnContext({
                context,
                documentRef,
                windowRef,
                storage,
                useNativeScroll
            });
            restorationPending = false;
        });
    };

    windowRef.addEventListener("pageshow", handlePageShow);
    cleanups.push(() => windowRef.removeEventListener("pageshow", handlePageShow));

    return Object.freeze({
        destroy() {
            cleanups.forEach((cleanup) => cleanup());
        }
    });
}

export function createPrivacyReturnContext({
    returnUrl,
    origin,
    focusId = PRIVACY_LINK_ID,
    scroll = { target: "window", x: 0, y: 0 },
    timestamp = Date.now()
}) {
    const returnPath = getRelativeUrl(returnUrl, origin);

    if (!returnPath) {
        return null;
    }

    return Object.freeze({
        returnPath,
        focusId,
        scroll: normalizeScroll(scroll),
        timestamp: Number(timestamp)
    });
}

export function parsePrivacyReturnContext(value, {
    origin,
    now = Date.now(),
    maxAgeMs = CONTEXT_MAX_AGE_MS
}) {
    let context;

    try {
        context = typeof value === "string" ? JSON.parse(value) : value;
    } catch {
        return null;
    }

    if (!context || typeof context !== "object") {
        return null;
    }

    const returnPath = getRelativeUrl(context.returnPath, origin);
    const timestamp = Number(context.timestamp);
    const age = Number(now) - timestamp;

    if (!returnPath
        || context.focusId !== PRIVACY_LINK_ID
        || !Number.isFinite(timestamp)
        || !Number.isFinite(age)
        || age < 0
        || age > maxAgeMs) {
        return null;
    }

    const scroll = normalizeScroll(context.scroll);

    if (!scroll) {
        return null;
    }

    return Object.freeze({
        returnPath,
        focusId: PRIVACY_LINK_ID,
        scroll,
        timestamp
    });
}

export function isPlainPrimaryActivation(event, link, baseUrl) {
    if (!event || !link || event.defaultPrevented || event.button !== 0) {
        return false;
    }

    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
        return false;
    }

    if (link.hasAttribute("download") || (link.target && link.target !== "_self")) {
        return false;
    }

    try {
        return new URL(link.href, baseUrl).origin === new URL(baseUrl).origin;
    } catch {
        return false;
    }
}

export function getSafeReturnMethod(context, {
    origin,
    referrer,
    historyLength
}) {
    const referrerPath = getRelativeUrl(referrer, origin);

    return Number(historyLength) > 1 && referrerPath === context?.returnPath
        ? "history"
        : "location";
}

export function captureScrollPosition(documentRef, windowRef) {
    const appShell = getScrollableAppShell(documentRef, windowRef);

    if (appShell) {
        return Object.freeze({
            target: "app-shell",
            x: appShell.scrollLeft,
            y: appShell.scrollTop
        });
    }

    return Object.freeze({
        target: "window",
        x: windowRef.scrollX ?? documentRef.documentElement.scrollLeft,
        y: windowRef.scrollY ?? documentRef.documentElement.scrollTop
    });
}

export function restorePrivacyReturnContext({
    context,
    documentRef,
    windowRef,
    storage,
    useNativeScroll = false
}) {
    if (!context
        || getRelativeUrl(windowRef.location.href, windowRef.location.origin) !== context.returnPath) {
        return false;
    }

    const target = documentRef.getElementById(context.focusId);

    if (!target || !isElementRendered(target, windowRef)) {
        return false;
    }

    if (!useNativeScroll) {
        restoreScrollPosition(context.scroll, documentRef, windowRef);
    }

    if (!isElementInViewport(target, documentRef)) {
        target.scrollIntoView({ block: "nearest", inline: "nearest" });
    }

    try {
        target.focus({ preventScroll: true });
    } catch {
        target.focus();
    }

    removePrivacyReturnContext(storage);
    return documentRef.activeElement === target;
}

function getScrollableAppShell(documentRef, windowRef) {
    const appShell = documentRef.querySelector(".app-shell");

    if (!appShell || appShell.scrollHeight <= appShell.clientHeight) {
        return null;
    }

    const overflowY = windowRef.getComputedStyle(appShell).overflowY;
    return ["auto", "scroll"].includes(overflowY) ? appShell : null;
}

function restoreScrollPosition(scroll, documentRef, windowRef) {
    if (scroll.target === "app-shell") {
        const appShell = documentRef.querySelector(".app-shell");

        if (appShell) {
            if (typeof appShell.scrollTo === "function") {
                appShell.scrollTo(scroll.x, scroll.y);
            } else {
                appShell.scrollLeft = scroll.x;
                appShell.scrollTop = scroll.y;
            }
        }

        return;
    }

    windowRef.scrollTo(scroll.x, scroll.y);
}

function normalizeScroll(scroll) {
    if (!scroll || !["window", "app-shell"].includes(scroll.target)) {
        return null;
    }

    const x = Number(scroll.x);
    const y = Number(scroll.y);

    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0) {
        return null;
    }

    return Object.freeze({ target: scroll.target, x, y });
}

function getRelativeUrl(value, origin) {
    if (typeof value !== "string" || !value || typeof origin !== "string" || !origin) {
        return null;
    }

    try {
        const url = new URL(value, origin);
        return url.origin === new URL(origin).origin
            ? `${url.pathname}${url.search}${url.hash}`
            : null;
    } catch {
        return null;
    }
}

function isElementRendered(element, windowRef) {
    const bounds = element.getBoundingClientRect();
    const style = windowRef.getComputedStyle(element);
    return bounds.width > 0
        && bounds.height > 0
        && style.display !== "none"
        && style.visibility !== "hidden";
}

function isElementInViewport(element, documentRef) {
    const bounds = element.getBoundingClientRect();
    return bounds.top >= 0
        && bounds.left >= 0
        && bounds.bottom <= documentRef.documentElement.clientHeight
        && bounds.right <= documentRef.documentElement.clientWidth;
}

function getSessionStorage(windowRef) {
    try {
        return windowRef.sessionStorage;
    } catch {
        return null;
    }
}

function writePrivacyReturnContext(storage, context) {
    if (!storage || !context) {
        return false;
    }

    try {
        storage.setItem(STORAGE_KEY, JSON.stringify(context));
        return true;
    } catch {
        return false;
    }
}

function readPrivacyReturnContext(storage, options) {
    if (!storage) {
        return null;
    }

    try {
        return parsePrivacyReturnContext(storage.getItem(STORAGE_KEY), options);
    } catch {
        return null;
    }
}

function removePrivacyReturnContext(storage) {
    try {
        storage?.removeItem(STORAGE_KEY);
    } catch {
        // sessionStorage can be unavailable without blocking navigation.
    }
}

if (typeof document !== "undefined" && typeof window !== "undefined") {
    initPrivacyReturn();
}

export const PRIVACY_RETURN_STORAGE_KEY = STORAGE_KEY;
export const PRIVACY_RETURN_MAX_AGE_MS = CONTEXT_MAX_AGE_MS;
