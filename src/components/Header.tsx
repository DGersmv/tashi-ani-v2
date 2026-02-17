"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import HeaderMenu from "./HeaderMenu";
import { useSiteSettings } from "@/components/ui/SiteSettingsContext";

export default function Header() {
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const settings = useSiteSettings();
  const logoSrc = settings.siteLogoPath || "/logo_new.png";

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width <= 650);
      setIsTablet(width > 650 && width <= 1200);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Размеры логотипа
  const logoSize = isMobile ? 60 : isTablet ? 70 : 80;
  const logoRadius = logoSize / 2;
  const innerPadding = logoRadius * 0.05;

  if (pathname === "/") return null;

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        backgroundColor: "transparent",
        padding: isMobile ? "8px 16px" : "16px var(--content-gutter, 24px)",
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        alignItems: isMobile ? "center" : "center",
        justifyContent: isMobile ? "center" : "flex-start",
        minHeight: isMobile ? "120px" : isTablet ? "90px" : "100px",
        gap: isMobile ? "8px" : "24px",
      }}
    >
      {/* Логотип — слева, по одной вертикали с контентом страницы */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: logoSize,
          height: logoSize,
          borderRadius: "50%",
          background: "rgba(206,214,177,0.18)",
          backdropFilter: "blur(18px)",
          border: "2px solid rgba(211,163,115,0.6)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          transition: "all 0.3s ease",
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.55)";
          e.currentTarget.style.boxShadow = "0 4px 14px rgba(0, 0, 0, 0.22), 0 0 12px rgba(64, 130, 109, 0.4)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "rgba(211,163,115,0.6)";
          e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
        }}
      >
        <Image
          src={logoSrc}
          alt="TASHI ANI STUDIO"
          width={logoSize * 0.9}
          height={logoSize * 0.9}
          style={{
            borderRadius: "50%",
            padding: innerPadding,
            transition: "transform 0.3s ease",
          }}
          priority
        />
      </div>

      {/* Меню — в потоке хедера, не вылезает за экран и не наезжает на логотип */}
      <div
        style={{
          display: "flex",
          justifyContent: isMobile ? "center" : "flex-end",
          alignItems: "center",
          width: isMobile ? "100%" : "100%",
          flex: isMobile ? undefined : 1,
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        <HeaderMenu isMobile={isMobile} isTablet={isTablet} />
      </div>
    </header>
  );
}
