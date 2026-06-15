import { useEffect, useState } from "react";

const STORAGE_KEY = "codefora_theme";

export function useTheme() {
  const [theme, setThemeState] = useState("dark");

  useEffect(() => {
    document.documentElement.dataset.theme = "dark";
    localStorage.setItem(STORAGE_KEY, "dark");
    window.dispatchEvent(new CustomEvent("codefora-theme-change", { detail: "dark" }));
    
    // Sync community immediately to prevent flashing
    const comm = localStorage.getItem("codefora_community") || "sider";
    document.documentElement.dataset.community = comm;
  }, []);

  function setTheme() {
    setThemeState("dark");
    document.documentElement.dataset.theme = "dark";
    localStorage.setItem(STORAGE_KEY, "dark");
  }

  return { theme, setTheme, toggleTheme: setTheme };
}
