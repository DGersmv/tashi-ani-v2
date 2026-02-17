"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { SiteSettingsPayload } from "@/app/api/site-settings/route";

const defaultSettings: SiteSettingsPayload = {
  menuFont: "ChinaCyr",
  headingFont: "ChinaCyr",
  contactPhone: "+7 921 952-61-17",
  contactWhatsApp: "https://wa.me/79219526117",
  contactTelegram: "https://t.me/tashiani",
  contactEmail: "info@tashi-ani.ru",
  telegramNewsChannel: "tashiani",
  mapCenterLon: 30.36,
  mapCenterLat: 59.94,
  mapLogoPath: "/points/default.png",
  siteLogoPath: "/logo_new.png",
  customFonts: [],
  mainPageHeadingFont: "ChinaCyr",
  mainPageTextFont: "ChinaCyr",
  mainPageTextMaxWidth: 720,
  mainPageTitle: "Ландшафт, который рекомендуют",
  mainPageBlocks: [],
};

const CYRILLIC_FALLBACK = "ChinaCyr, Arial, Helvetica, sans-serif";

export function buildFontStack(selectedFont: string): string {
  const font = selectedFont?.trim() || "ChinaCyr";
  return `${font}, ${CYRILLIC_FALLBACK}`;
}

export type SiteSettingsContextValue = SiteSettingsPayload & {
  updateSettings: (partial: Partial<SiteSettingsPayload>) => void;
};

const noopUpdate = () => {};
const SiteSettingsContext = createContext<SiteSettingsContextValue>({ ...defaultSettings, updateSettings: noopUpdate });

export function SiteSettingsProvider({
  children,
  initialSettings = null,
}: {
  children: React.ReactNode;
  /** Настройки с сервера для первого рендера (без мерцания шрифта) */
  initialSettings?: SiteSettingsPayload | null;
}) {
  const [settings, setSettings] = useState<SiteSettingsPayload>(initialSettings ?? defaultSettings);
  const updateSettings = React.useCallback((partial: Partial<SiteSettingsPayload>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/site-settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data && typeof data === "object") {
          const next = { ...defaultSettings, ...data };
          setSettings(next);
          if (typeof document !== "undefined") {
            document.documentElement.style.setProperty("--font-menu", buildFontStack(next.menuFont || "ChinaCyr"));
            document.documentElement.style.setProperty("--font-heading", buildFontStack(next.headingFont || "ChinaCyr"));
            document.documentElement.style.setProperty("--font-main-heading", buildFontStack(next.mainPageHeadingFont || "ChinaCyr"));
            document.documentElement.style.setProperty("--font-main-text", buildFontStack(next.mainPageTextFont || "ChinaCyr"));
          }
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.style.setProperty("--font-menu", buildFontStack(settings.menuFont || "ChinaCyr"));
    document.documentElement.style.setProperty("--font-heading", buildFontStack(settings.headingFont || "ChinaCyr"));
    document.documentElement.style.setProperty("--font-main-heading", buildFontStack(settings.mainPageHeadingFont || "ChinaCyr"));
    document.documentElement.style.setProperty("--font-main-text", buildFontStack(settings.mainPageTextFont || "ChinaCyr"));
  }, [settings.menuFont, settings.headingFont, settings.mainPageHeadingFont, settings.mainPageTextFont]);

  // Инъекция @font-face для загруженных шрифтов (customFonts)
  useEffect(() => {
    const customFonts = settings.customFonts ?? [];
    if (customFonts.length === 0) return;
    const id = "custom-fonts-style";
    let el = document.getElementById(id) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = id;
      document.head.appendChild(el);
    }
    const format = (url: string) => {
      if (url.endsWith(".woff2")) return "woff2";
      if (url.endsWith(".woff")) return "woff";
      return "truetype";
    };
    el.textContent = customFonts
      .map(
        (f) =>
          `@font-face{font-family:'${f.fontFamily.replace(/'/g, "\\'")}';src:url('${f.url}') format('${format(f.url)}');font-display:swap;}`
      )
      .join("\n");
    return () => {
      const style = document.getElementById(id);
      if (style) style.remove();
    };
  }, [settings.customFonts]);

  const contextValue: SiteSettingsContextValue = React.useMemo(
    () => ({ ...settings, updateSettings }),
    [settings, updateSettings]
  );

  return (
    <SiteSettingsContext.Provider value={contextValue}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings(): SiteSettingsContextValue {
  return useContext(SiteSettingsContext);
}
