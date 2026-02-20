"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useFullPageScroll } from "@/components/FullPageScroll";
import { useSiteSettings } from "@/components/ui/SiteSettingsContext";

const PHONE = "+7 921 952-61-17";
const TEL_HREF = "tel:+79219526117";

export default function SiteNav() {
  const { currentIndex, goTo } = useFullPageScroll();
  const settings = useSiteSettings();
  const logoSrc = settings.siteLogoPath || "/logo_new.png";

  const isFirstSlide = currentIndex === 0;

  return (
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
        padding: "24px var(--content-gutter, 36px)",
        minHeight: 108,
        backgroundColor: isFirstSlide ? "transparent" : "rgba(28, 27, 22, 0.92)",
        backdropFilter: isFirstSlide ? "none" : "blur(16px)",
        WebkitBackdropFilter: isFirstSlide ? "none" : "blur(16px)",
        transition: "background-color 0.5s ease, backdrop-filter 0.5s ease",
      }}
    >
      {/* Логотип — как в текущем Header, без изменений */}
      <div style={{ display: "flex", alignItems: "center", gap: 18, flexShrink: 0 }}>
        <div
          style={{
            width: 66,
            height: 66,
            borderRadius: "50%",
            background: "rgba(206, 214, 177, 0.18)",
            backdropFilter: "blur(18px)",
            border: "3px solid rgba(201, 169, 110,  0.6)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          <Image
            src={logoSrc}
            alt="ТАШИ-АНИ"
            width={57}
            height={57}
            style={{ borderRadius: "50%" }}
            priority
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span
            style={{
              fontFamily: "var(--font-cormorant), serif",
              fontSize: "1.875rem",
              fontWeight: 600,
              color: "var(--cream)",
              letterSpacing: "0.02em",
            }}
          >
            ТАШИ-АНИ
          </span>
          <span
            style={{
              fontSize: "0.78rem",
              color: "var(--gold)",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              fontFamily: "var(--font-jost), sans-serif",
            }}
          >
            Ландшафтная студия
          </span>
        </div>
      </div>

      {/* Ссылки — переход по слайдам */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 42,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <button
          type="button"
          onClick={() => goTo(3)}
          style={linkStyle(isFirstSlide)}
        >
          Услуги
        </button>
        <button
          type="button"
          onClick={() => goTo(4)}
          style={linkStyle(isFirstSlide)}
        >
          Портфолио
        </button>
        <button
          type="button"
          onClick={() => goTo(1)}
          style={linkStyle(isFirstSlide)}
        >
          О нас
        </button>
        <Link
          href="/dashboard"
          style={linkStyle(isFirstSlide)}
        >
          Кабинет
        </Link>
      </div>

      {/* Телефон */}
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
    </nav>
  );
}

function linkStyle(isFirstSlide: boolean): React.CSSProperties {
  return {
    color: isFirstSlide ? "var(--cream)" : "var(--warm-white)",
    background: "none",
    border: "none",
    padding: "12px 6px",
    cursor: "none",
    fontFamily: "var(--font-jost), sans-serif",
    fontSize: "1.35rem",
    fontWeight: 500,
    textDecoration: "none",
    transition: "opacity 0.2s",
  };
}
