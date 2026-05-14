const themeToggle = document.querySelector("#theme-toggle");
const themeToggleIcon = document.querySelector("#theme-toggle-icon");
const themeToggleText = document.querySelector("#theme-toggle-text");

const THEME_STORAGE_KEY = "azerslide-ui-theme";

function getSavedTheme() {
  try {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return savedTheme === "night" ? "night" : "light";
  } catch (error) {
    return "light";
  }
}

function saveTheme(theme) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {
    // Ignore storage errors and keep the current in-memory theme.
  }
}

function renderThemeToggle(theme) {
  const isNight = theme === "night";
  const nextThemeLabel = isNight ? "Light mode" : "Night mode";

  document.body.dataset.theme = theme;
  themeToggle?.setAttribute("aria-pressed", String(isNight));
  themeToggle?.setAttribute("aria-label", nextThemeLabel);
  themeToggle?.setAttribute("title", nextThemeLabel);

  if (themeToggleIcon) {
    themeToggleIcon.textContent = isNight ? "\u2600" : "\u263E";
  }

  if (themeToggleText) {
    themeToggleText.textContent = nextThemeLabel;
  }
}

function toggleTheme() {
  const nextTheme = document.body.dataset.theme === "night" ? "light" : "night";
  renderThemeToggle(nextTheme);
  saveTheme(nextTheme);
}

renderThemeToggle(getSavedTheme());
themeToggle?.addEventListener("click", toggleTheme);
