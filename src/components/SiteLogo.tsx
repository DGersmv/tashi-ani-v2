"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";

export default function SiteLogo() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const on = () => setIsMobile(window.innerWidth <= 650);
    on();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);

  // размеры с учётом увеличения на ~15%
  const size = isMobile ? 102 : 138; // контейнер
  const radius = size / 2;
  const logoSize = size * 0.9; // логотип займёт около 50% контейнера
  const innerPadding = radius * 0.05; // отступ от границы ≈ 25% радиуса

  return (
    <div
      style={{
        ...(isMobile
          ? {
              position: "static",
              margin: "18px auto 8px",
              zIndex: "auto",
            }
          : {
              position: "fixed",
              top: 22,
              left: 24,
              zIndex: 300,
            }),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: "50%",
        background: "rgba(206,214,177,0.18)", // лёгкий мятный тон
        backdropFilter: "blur(18px)",
        border: "2px solid rgba(211,163,115,0.6)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        transition: "all 0.3s ease",
      }}
    >
      <Image
        src="/logo_new.png"
        alt="TASHI ANI STUDIO"
        width={logoSize}
        height={logoSize}
        style={{
          borderRadius: "50%",
          padding: innerPadding, // равный отступ от границы
          transition: "transform 0.3s ease",
        }}
        priority
      />
      <style jsx>{`
        div:hover {
          border-color: rgba(255, 255, 255, 0.55);
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.22),
            0 0 12px rgba(64, 130, 109, 0.4);
        }
        div:hover img {
          transform: scale(1.05);
        }
      `}</style>
    </div>
  );
}
