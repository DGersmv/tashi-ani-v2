"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useViewMode } from "./ViewMode";

/** Ставит mode="portfolio" на /portfolio..., иначе "home". */
export default function ModeSync() {
  const pathname = usePathname();
  const { setMode } = useViewMode();

  useEffect(() => {
    if (pathname?.startsWith("/portfolio")) setMode("portfolio");
    else setMode("home");
  }, [pathname, setMode]);

  return null;
}
