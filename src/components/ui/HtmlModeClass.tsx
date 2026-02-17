"use client";

import { useEffect } from "react";
import { useViewMode } from "./ViewMode";

/** Вешает на <html> data-view-mode="home|portfolio", удобно для глобальных стилей. */
export default function HtmlModeClass() {
  const { mode } = useViewMode();

  useEffect(() => {
    document.documentElement.setAttribute("data-view-mode", mode);
    return () => document.documentElement.removeAttribute("data-view-mode");
  }, [mode]);

  return null;
}
