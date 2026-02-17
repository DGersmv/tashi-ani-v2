// src/components/ui/ViewMode.tsx
"use client";
import React, { createContext, useContext, useEffect, useState } from "react";

type Mode = "home" | "portfolio" | "services" | "news" | "dashboard" | "admin-dashboard" | "objects" | "object-detail" | "admin-objects" | "admin-object-detail" | "photo-viewer";
type Ctx = { mode: Mode; setMode: (m: Mode) => void };

const ViewModeContext = createContext<Ctx>({ mode: "home", setMode: () => {} });

export function ViewModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<Mode>("home");

  // Esc → вернуться на главную
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMode("home"); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <ViewModeContext.Provider value={{ mode, setMode }}>
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode() {
  return useContext(ViewModeContext);
}
