"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

interface GlobalLoginContextType {
  isLoginOpen: boolean;
  openLogin: () => void;
  closeLogin: () => void;
  toggleLogin: () => void;
}

const GlobalLoginContext = createContext<GlobalLoginContextType | null>(null);

export function useGlobalLogin() {
  const context = useContext(GlobalLoginContext);
  if (!context) {
    throw new Error('useGlobalLogin must be used within a GlobalLoginProvider');
  }
  return context;
}

export function GlobalLoginProvider({ children }: { children: React.ReactNode }) {
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  const openLogin = useCallback(() => {
    setIsLoginOpen(true);
  }, []);

  const closeLogin = useCallback(() => {
    setIsLoginOpen(false);
  }, []);

  const toggleLogin = useCallback(() => {
    setIsLoginOpen(prev => !prev);
  }, []);

  const value = {
    isLoginOpen,
    openLogin,
    closeLogin,
    toggleLogin,
  };

  return (
    <GlobalLoginContext.Provider value={value}>
      {children}
    </GlobalLoginContext.Provider>
  );
}