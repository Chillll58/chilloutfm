"use client";

import { useEffect } from "react";

export type Theme = "dark" | "light";

export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const t = localStorage.getItem("chillout_theme");
  return t === "light" ? "light" : "dark";
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "light") {
    root.classList.add("light");
    root.style.colorScheme = "light";
  } else {
    root.classList.remove("light");
    root.style.colorScheme = "dark";
  }
  localStorage.setItem("chillout_theme", theme);
}

/** Applies stored theme on first paint. */
export default function ThemeManager() {
  useEffect(() => {
    applyTheme(getStoredTheme());
  }, []);
  return null;
}
