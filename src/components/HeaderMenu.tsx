"use client";
import React, { useEffect, useState, useRef } from "react";
import { useViewMode } from "@/components/ui/ViewMode";
import { useLoginFlow } from "@/components/ui/LoginFlowContext";
import { useSiteSettings } from "@/components/ui/SiteSettingsContext";
import { useOpenSiteSettings } from "@/components/ui/OpenSiteSettingsContext";
import { useAuth } from "@/components/ui/AuthContext";
import LoginPanel from "@/components/LoginPanel";
import ContactsPanel from "@/components/ContactsPanel";

interface HeaderMenuProps {
  isMobile?: boolean;
  isTablet?: boolean;
}

export default function HeaderMenu({ isMobile: propIsMobile, isTablet: propIsTablet }: HeaderMenuProps = {}) {
  const [open, setOpen] = useState(false);
  const [isWide, setIsWide] = useState(false);
  const [isMobileLocal, setIsMobileLocal] = useState(typeof window !== "undefined" ? window.innerWidth <= 650 : false);
  const [isTabletLocal, setIsTabletLocal] = useState(typeof window !== "undefined" ? window.innerWidth > 650 && window.innerWidth <= 1200 : false);
  const isMobile = propIsMobile ?? isMobileLocal;
  const isTablet = propIsTablet ?? isTabletLocal;
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isContactsOpen, setIsContactsOpen] = useState(false);
  const { isLoggedIn, isAdmin, userEmail, refreshAuth } = useAuth();
  const { setMode, mode } = useViewMode();
  const { setLoginRequested } = useLoginFlow();
  const { setOpenSiteSettings } = useOpenSiteSettings();
  const settings = useSiteSettings();

  const displayName = userEmail ? (userEmail.includes("@") ? userEmail.split("@")[0] : userEmail).slice(0, 16) : "";
  const loginOpenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contactsOpenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const on = () => {
      const w = window.innerWidth;
      setIsWide(w > 1200);
      setIsMobileLocal(w <= 650);
      setIsTabletLocal(w > 650 && w <= 1200);
    };
    on();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setOpen(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    return () => {
      if (loginOpenTimerRef.current) clearTimeout(loginOpenTimerRef.current);
      if (contactsOpenTimerRef.current) clearTimeout(contactsOpenTimerRef.current);
    };
  }, []);

  const handleLoginSuccess = (email: string, admin?: boolean) => {
    localStorage.setItem("userEmail", email);
    localStorage.setItem("isLoggedIn", "true");
    if (admin) localStorage.setItem("isAdmin", "true");
    refreshAuth();
    setMode(admin ? "admin-dashboard" : "dashboard");
  };

  const handleLogout = () => {
    localStorage.removeItem("userEmail");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userToken");
    localStorage.removeItem("adminToken");
    localStorage.removeItem("isAdmin");
    refreshAuth();
    setMode("home");
  };

  const bar: React.CSSProperties = {
    position: "relative",
    marginTop: 12,
    width: "100%",
    paddingRight: isWide ? 0 : 0,
    zIndex: 200,
  };

  // Панель всегда в пределах экрана: не 96vw, не наезжает на логотип
  const panel: React.CSSProperties = isMobile
    ? {
        width: "100%",
        maxWidth: "100%",
        margin: "10px 0 0",
        borderRadius: 12,
        backdropFilter: "blur(18px)",
        background: "linear-gradient(180deg, rgba(255,255,255,.18), rgba(255,255,255,.12))",
        border: "2px solid rgba(90, 107, 151, 0.6)",
        boxShadow: "0 8px 24px rgba(0,0,0,.25), inset 0 0 0 1px rgba(255,255,255,.22)",
        padding: "8px 12px",
        overflow: "hidden",
      }
    : isWide
    ? {
        width: "fit-content",
        maxWidth: "100%",
        marginLeft: "auto",
        marginRight: 0,
        borderRadius: 9999,
        backdropFilter: "blur(18px)",
        background: "linear-gradient(180deg, rgba(255,255,255,.18), rgba(255,255,255,.12))",
        border: "2px solid rgba(211, 163, 115, 0.6)",
        boxShadow: "0 8px 24px rgba(0,0,0,.25), inset 0 0 0 1px rgba(255,255,255,.22)",
        padding: "12px 22px",
        overflow: "hidden",
      }
    : {
        width: "fit-content",
        maxWidth: "100%",
        marginLeft: "auto",
        marginRight: 0,
        borderRadius: 16,
        backdropFilter: "blur(18px)",
        background: "linear-gradient(180deg, rgba(255,255,255,.18), rgba(255,255,255,.12))",
        border: "2px solid rgba(90, 107, 151, 0.6)",
        boxShadow: "0 8px 24px rgba(0,0,0,.25), inset 0 0 0 1px rgba(255,255,255,.22)",
        padding: "10px 16px",
        overflow: "hidden",
      };

  // единый шрифт для всех пунктов — ChinaCyr (fallback Montserrat)
  const linkFont: React.CSSProperties = {
    fontFamily: "var(--font-menu, ChinaCyr), var(--font-montserrat), sans-serif",
    whiteSpace: "nowrap",
    flexShrink: 1, // Позволяет элементам сжиматься
    minWidth: 0, // Позволяет тексту обрезаться
  };


  return (
    <div style={bar}>
      <nav className={`menu-strip${open ? " open" : ""}`} style={panel}>
        <div
          className="menu-links"
          style={{
            display: "flex",
            alignItems: "center",
            width: isWide ? "100%" : "100%",
            gap: isWide ? 18 : 6,
            flexWrap: isWide ? "nowrap" : "wrap",
            justifyContent: isWide ? "center" : "center",
            overflow: "hidden",
            minWidth: 0,
          }}
        >
          <button
            type="button"
            className="menu-link"
            style={linkFont}
            onClick={() => {
              setLoginRequested(true);
              if (contactsOpenTimerRef.current) clearTimeout(contactsOpenTimerRef.current);
              contactsOpenTimerRef.current = setTimeout(() => {
                contactsOpenTimerRef.current = null;
                setIsContactsOpen(true);
              }, 520);
            }}
          >
            {settings.contactPhone ?? "+7 921 952-61-17"}
          </button>

          <button
            type="button"
            className={`menu-link ${mode === "home" ? 'active' : ''}`}
            onClick={() => setMode("home")}
            style={linkFont}
          >
            Главная
          </button>

          <button
            type="button"
            className={`menu-link ${mode === "services" ? 'active' : ''}`}
            onClick={() => setMode("services")}
            style={linkFont}
          >
            Услуги
          </button>

          <button
            type="button"
            className={`menu-link ${mode === "portfolio" ? 'active' : ''}`}
            onClick={() => setMode("portfolio")}
            style={linkFont}
          >
            Портфолио
          </button>

          <button
            type="button"
            className={`menu-link ${mode === "news" ? 'active' : ''}`}
            onClick={() => setMode("news")}
            style={linkFont}
          >
            Новости и рекомендации
          </button>

              {!isLoggedIn ? (
                <button
                  type="button"
                  className="menu-link"
                  onClick={() => {
                    setLoginRequested(true);
                    if (loginOpenTimerRef.current) clearTimeout(loginOpenTimerRef.current);
                    loginOpenTimerRef.current = setTimeout(() => {
                      loginOpenTimerRef.current = null;
                      setIsLoginOpen(true);
                    }, 520);
                  }}
                  style={linkFont}
                >
                  Вход
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className={`menu-link ${mode === "dashboard" || mode === "admin-dashboard" ? 'active' : ''}`}
                    onClick={() => setMode(isAdmin ? "admin-dashboard" : "dashboard")}
                    style={{ 
                      ...linkFont, 
                      color: mode === "dashboard" || mode === "admin-dashboard" ? "rgba(211, 163, 115, 1)" : "rgba(211, 163, 115, 0.9)",
                    }}
                    title={userEmail}
                  >
                    {displayName || userEmail || (isAdmin ? "Админ" : "Кабинет")}
                  </button>
                  {isAdmin && (
                    <button
                      type="button"
                      className={`menu-link ${mode === "admin-dashboard" ? '' : ''}`}
                      onClick={() => {
                        setOpenSiteSettings(true);
                        setMode("admin-dashboard");
                      }}
                      style={linkFont}
                    >
                      Настройки
                    </button>
                  )}
                  <button
                    type="button"
                    className="menu-link"
                    onClick={handleLogout}
                    style={{ 
                      ...linkFont, 
                      color: "rgba(239, 68, 68, 0.9)"
                    }}
                  >
                    Выйти
                  </button>
                </>
              )}
        </div>
      </nav>

      {/* Панель входа */}
      <LoginPanel 
        isOpen={isLoginOpen} 
        onClose={() => {
          setIsLoginOpen(false);
          setLoginRequested(false);
        }}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Панель контактов (телефон → Telegram, email) — то же поведение, что и панель входа */}
      <ContactsPanel
        isOpen={isContactsOpen}
        onClose={() => {
          setIsContactsOpen(false);
          setLoginRequested(false);
        }}
      />

    </div>
  );
}
