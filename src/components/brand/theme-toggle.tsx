"use client";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function ThemeToggle() {
  function toggle() {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    localStorage.setItem("stayflat_theme", next);
    applyTheme(next);
  }

  return (
    <button className="theme-toggle" type="button" onClick={toggle} aria-label="Toggle light and dark mode">
      <span className="theme-toggle-light" aria-hidden="true">☀</span>
      <span className="theme-toggle-dark" aria-hidden="true">☾</span>
      <span className="theme-toggle-light">Light</span>
      <span className="theme-toggle-dark">Dark</span>
    </button>
  );
}
