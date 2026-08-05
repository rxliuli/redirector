import { useEffect, useSyncExternalStore } from "react";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function subscribe(onChange: () => void) {
	const mql = window.matchMedia(DARK_QUERY);
	mql.addEventListener("change", onChange);
	return () => mql.removeEventListener("change", onChange);
}

function getSnapshot() {
	return window.matchMedia(DARK_QUERY).matches;
}

export function useSystemTheme(): "light" | "dark" {
	return useSyncExternalStore(subscribe, getSnapshot) ? "dark" : "light";
}

// Replaces mode-watcher's <ModeWatcher />: keeps the `dark` class and
// color-scheme on <html> in sync with the OS preference.
export function useApplySystemTheme(): "light" | "dark" {
	const theme = useSystemTheme();
	useEffect(() => {
		document.documentElement.classList.toggle("dark", theme === "dark");
		document.documentElement.style.colorScheme = theme;
	}, [theme]);
	return theme;
}
