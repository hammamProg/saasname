"use client";

/** Switches between light and dark.
 *
 *  Holds no React state on purpose. The theme already lives on <html> as a
 *  data attribute, set before first paint by the inline script in layout.tsx,
 *  so mirroring it into state would mean rendering one icon on the server,
 *  another after hydration, and a cascading re-render to get there. CSS reads
 *  the attribute directly instead, and the click handler is the only JS. */
export default function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const next = root.dataset.theme === "dark" ? "light" : "dark";

    root.dataset.theme = next;

    try {
      localStorage.setItem("theme", next);
    } catch {
      // Storage can be blocked; the theme still applies for this page view.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      // A single label, because the button renders identically on the server
      // whichever theme is active and the icon is chosen by CSS.
      aria-label="Switch between light and dark theme"
      className="flex size-9 items-center justify-center rounded-xl border border-border text-muted transition hover:border-primary/40 hover:text-foreground"
    >
      <svg
        viewBox="0 0 24 24"
        className="theme-icon-moon size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M20 13.5A8.5 8.5 0 1 1 10.5 4a6.6 6.6 0 0 0 9.5 9.5z" />
      </svg>

      <svg
        viewBox="0 0 24 24"
        className="theme-icon-sun size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
      </svg>
    </button>
  );
}
