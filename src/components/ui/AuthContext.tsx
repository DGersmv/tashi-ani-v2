"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

type AuthState = {
  userEmail: string;
  isLoggedIn: boolean;
  isAdmin: boolean;
};

const defaultState: AuthState = {
  userEmail: "",
  isLoggedIn: false,
  isAdmin: false,
};

type AuthContextType = AuthState & {
  refreshAuth: () => void;
};

const AuthContext = createContext<AuthContextType>({
  ...defaultState,
  refreshAuth: () => {},
});

function readAuthFromStorage(): AuthState {
  if (typeof window === "undefined") return defaultState;
  const userEmail = localStorage.getItem("userEmail") || "";
  const isLoggedIn =
    !!(userEmail && (localStorage.getItem("isLoggedIn") === "true" || localStorage.getItem("userToken")));
  const isAdmin = !!(localStorage.getItem("adminToken") || localStorage.getItem("isAdmin") === "true");
  return {
    userEmail: isAdmin && !userEmail ? "2277277@bk.ru" : userEmail,
    isLoggedIn: isLoggedIn || isAdmin,
    isAdmin,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(defaultState);

  const refreshAuth = useCallback(() => {
    setState(readAuthFromStorage());
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  return (
    <AuthContext.Provider value={{ ...state, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
