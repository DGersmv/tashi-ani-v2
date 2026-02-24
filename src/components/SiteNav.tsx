"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useFullPageScroll } from "@/components/FullPageScroll";
import { useSiteSettings } from "@/components/ui/SiteSettingsContext";
import { useGlobalLogin } from "@/components/ui/GlobalLoginContext";
import NavParticleItem, { LogoParticleCanvas } from "@/components/NavParticleItem";

const PHONE = "+7 921 952-61-17";
const TEL_HREF = "tel:+79219526117";
const MOBILE_BP = 768;

export default function SiteNav() {
  const { currentIndex, goTo } = useFullPageScroll();
  const settings = useSiteSettings();
  const logoSrc = settings.siteLogoPath || "/logo_new.png";
  const { openLogin } = useGlobalLogin();

  const isFirstSlide = currentIndex === 0;
  const [isMobile, setIsMobile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= MOBILE_BP);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Close dropdown when slide changes
  useEffect(() => { setMenuOpen(false); }, [currentIndex]);

  const navActions = [
    { label: "Услуги",     action: () => { goTo(3); setMenuOpen(false); } },
    { label: "Портфолио",  action: () => { goTo(4); setMenuOpen(false); } },
    { label: "О нас",      action: () => { goTo(1); setMenuOpen(false); } },
    { label: "Кабинет",    action: () => { openLogin(); setMenuOpen(false); } },
  ];

  return (
    <>
      <nav
        role="navigation"
        aria-label="Основное меню"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 200,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: isMobile ? "12px 16px" : "24px var(--content-gutter, 36px)",
          minHeight: isMobile ? 68 : 108,
          backgroundColor: isFirstSlide ? "transparent" : "rgba(28, 27, 22, 0.92)",
          backdropFilter: isFirstSlide ? "none" : "blur(16px)",
          WebkitBackdropFilter: isFirstSlide ? "none" : "blur(16px)",
          transition: "background-color 0.5s ease, backdrop-filter 0.5s ease",
        }}
      >
        {/* Логотип */}
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 10 : 18, flexShrink: 0 }}>
          <div
            style={{
              width: isMobile ? 46 : 66,
              height: isMobile ? 46 : 66,
              borderRadius: "50%",
              background: "rgba(206, 214, 177, 0.18)",
              backdropFilter: "blur(18px)",
              border: "3px solid rgba(201, 169, 110, 0.6)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            <Image
              src={logoSrc}
              alt="ТАШИ-АНИ"
              width={isMobile ? 38 : 57}
              height={isMobile ? 38 : 57}
              style={{ borderRadius: "50%" }}
              priority
            />
          </div>
          {!isMobile && <LogoParticleCanvas />}
        </div>

        {/* Десктоп: ссылки и телефон */}
        {!isMobile && (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 42,
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              <NavParticleItem text="Услуги" onClick={() => goTo(3)} startDelay={0} />
              <NavParticleItem text="Портфолио" onClick={() => goTo(4)} startDelay={350} />
              <NavParticleItem text="О нас" onClick={() => goTo(1)} startDelay={700} />
              <NavParticleItem text="Кабинет" onClick={openLogin} startDelay={1050} />
            </div>
            <a
              href={TEL_HREF}
              style={{
                color: "var(--gold)",
                textDecoration: "none",
                fontFamily: "var(--font-jost), sans-serif",
                fontSize: "1.43rem",
                fontWeight: 500,
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {PHONE}
            </a>
          </>
        )}

        {/* Мобайл: гамбургер */}
        {isMobile && (
          <button
            type="button"
            aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 8,
              display: "flex",
              flexDirection: "column",
              gap: 5,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <span style={{
              display: "block", width: 24, height: 2,
              background: "rgba(201,169,110,0.9)", borderRadius: 2,
              transform: menuOpen ? "translateY(7px) rotate(45deg)" : "none",
              transition: "transform 0.22s",
            }} />
            <span style={{
              display: "block", width: 24, height: 2,
              background: "rgba(201,169,110,0.9)", borderRadius: 2,
              opacity: menuOpen ? 0 : 1,
              transition: "opacity 0.15s",
            }} />
            <span style={{
              display: "block", width: 24, height: 2,
              background: "rgba(201,169,110,0.9)", borderRadius: 2,
              transform: menuOpen ? "translateY(-7px) rotate(-45deg)" : "none",
              transition: "transform 0.22s",
            }} />
          </button>
        )}
      </nav>

      {/* Мобильное меню-шторка */}
      {isMobile && (
        <div
          style={{
            position: "fixed",
            top: 68,
            left: 0,
            right: 0,
            zIndex: 199,
            background: "rgba(18, 17, 13, 0.97)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderBottom: "1px solid rgba(201,169,110,0.18)",
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
            padding: menuOpen ? "12px 0 20px" : 0,
            maxHeight: menuOpen ? 400 : 0,
            overflow: "hidden",
            transition: "max-height 0.32s cubic-bezier(.4,0,.2,1), padding 0.22s",
          }}
        >
          {navActions.map(({ label, action }) => (
            <button
              key={label}
              type="button"
              onClick={action}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "14px 24px",
                textAlign: "left",
                fontFamily: "var(--font-jost), ChinaCyr, sans-serif",
                fontSize: "1.1rem",
                fontWeight: 500,
                color: "rgba(201,169,110,0.9)",
                letterSpacing: "0.04em",
                borderBottom: "1px solid rgba(201,169,110,0.08)",
              }}
            >
              {label}
            </button>
          ))}
          <a
            href={TEL_HREF}
            onClick={() => setMenuOpen(false)}
            style={{
              display: "block",
              padding: "14px 24px",
              textDecoration: "none",
              fontFamily: "var(--font-jost), sans-serif",
              fontSize: "1rem",
              fontWeight: 500,
              color: "rgba(201,169,110,0.6)",
              letterSpacing: "0.04em",
            }}
          >
            {PHONE}
          </a>
        </div>
      )}
    </>
  );
}
