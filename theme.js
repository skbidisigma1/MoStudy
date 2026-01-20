const THEME_STORAGE_KEY = "mostudy-theme";
const THEME_DARK = "dark";
const THEME_LIGHT = "light";

function getStoredTheme() {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === THEME_LIGHT ? THEME_LIGHT : THEME_DARK;
}

function updateThemeToggle(mode) {
    const toggle = document.getElementById("theme-toggle");
    if (!toggle) return;

    const icon = toggle.querySelector("[data-theme-icon]");
    const label = toggle.querySelector("[data-theme-label]");
    const isDark = mode === THEME_DARK;

    toggle.setAttribute("aria-pressed", isDark ? "true" : "false");
    if (icon) icon.textContent = isDark ? "🌙" : "☀️";
    if (label) label.textContent = isDark ? "Dark" : "Light";
}

function applyTheme(mode) {
    if (typeof DarkReader === "undefined") return;

    if (mode === THEME_LIGHT) {
        DarkReader.disable();
    } else {
        DarkReader.enable({
            brightness: 100,
            contrast: 90,
            sepia: 0,
        });
    }

    localStorage.setItem(THEME_STORAGE_KEY, mode);
    updateThemeToggle(mode);
}

function initThemeToggle() {
    if (typeof DarkReader === "undefined") return;

    DarkReader.setFetchMethod(window.fetch);
    applyTheme(getStoredTheme());

    const toggle = document.getElementById("theme-toggle");
    if (!toggle) return;

    toggle.addEventListener("click", () => {
        const nextMode = getStoredTheme() === THEME_DARK ? THEME_LIGHT : THEME_DARK;
        applyTheme(nextMode);
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initThemeToggle);
} else {
    initThemeToggle();
}
