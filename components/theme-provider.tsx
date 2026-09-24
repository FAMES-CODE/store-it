"use client"

import * as React from "react"

type Theme = "light" | "dark"
type ThemeContextValue = {
  resolvedTheme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null)

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark")
}

function isTypingTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  )
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // The server and first client render are identical; a saved theme is applied only after hydration.
  const [theme, setThemeState] = React.useState<Theme>("light")
  const setTheme = React.useCallback((nextTheme: Theme) => {
    setThemeState(nextTheme)
    localStorage.setItem("store-it-theme", nextTheme)
    applyTheme(nextTheme)
  }, [])

  React.useEffect(() => {
    const savedTheme = localStorage.getItem("store-it-theme")
    if (savedTheme === "dark" || savedTheme === "light") {
      // Defer the client preference until after the hydration commit.
      queueMicrotask(() => {
        setThemeState(savedTheme)
        applyTheme(savedTheme)
      })
    }
  }, [])

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        event.repeat ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.key.toLowerCase() !== "d" ||
        isTypingTarget(event.target)
      )
        return
      setTheme(theme === "dark" ? "light" : "dark")
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [setTheme, theme])

  return (
    <ThemeContext.Provider value={{ resolvedTheme: theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = React.useContext(ThemeContext)
  if (!context) throw new Error("useTheme must be used within ThemeProvider.")
  return context
}
