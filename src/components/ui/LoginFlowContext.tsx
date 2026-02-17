"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

type LoginFlowContextValue = {
  loginRequested: boolean;
  setLoginRequested: (v: boolean) => void;
  enteredHome: boolean;
  setEnteredHome: (v: boolean) => void;
};

const LoginFlowContext = createContext<LoginFlowContextValue | null>(null);

export function LoginFlowProvider({ children }: { children: React.ReactNode }) {
  const [loginRequested, setLoginRequested] = useState(false);
  const [enteredHome, setEnteredHome] = useState(false);
  return (
    <LoginFlowContext.Provider value={{ loginRequested, setLoginRequested, enteredHome, setEnteredHome }}>
      {children}
    </LoginFlowContext.Provider>
  );
}

export function useLoginFlow() {
  const ctx = useContext(LoginFlowContext);
  if (!ctx) throw new Error("useLoginFlow must be used within LoginFlowProvider");
  return ctx;
}
