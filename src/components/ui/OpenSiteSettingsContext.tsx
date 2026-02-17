"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

type OpenSiteSettingsContextType = {
  openSiteSettings: boolean;
  setOpenSiteSettings: (open: boolean) => void;
};

const OpenSiteSettingsContext = createContext<OpenSiteSettingsContextType | null>(null);

export function OpenSiteSettingsProvider({ children }: { children: React.ReactNode }) {
  const [openSiteSettings, setOpenSiteSettings] = useState(false);
  return (
    <OpenSiteSettingsContext.Provider value={{ openSiteSettings, setOpenSiteSettings }}>
      {children}
    </OpenSiteSettingsContext.Provider>
  );
}

export function useOpenSiteSettings() {
  const ctx = useContext(OpenSiteSettingsContext);
  return ctx ?? { openSiteSettings: false, setOpenSiteSettings: () => {} };
}
