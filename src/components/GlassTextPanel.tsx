"use client";
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

export default function GlassTextPanel({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const on = () => setIsMobile(window.innerWidth <= 650);
    on();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);

  const pad = isMobile ? 3 : 5;

  const wrapper: React.CSSProperties = isMobile
    ? {
        position: "relative",
        margin: "14px auto 0",
        width: "96vw",
        aspectRatio: "21 / 12",
        borderRadius: "1.2rem",
        pointerEvents: "none",
      }
    : {
        position: "relative",
        margin: "18px 24px 48px 160px",
        width: "calc(100vw - 160px - 24px)",
        aspectRatio: "21 / 9",
        borderRadius: "2.0rem",
        pointerEvents: "none",
      };

  return (
    <div style={wrapper}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.44, 0.13, 0.35, 1.08] }}
        style={{
          position: "absolute",
          inset: pad,
          width: `calc(100% - ${pad * 2}px)`,
          height: `calc(100% - ${pad * 2}px)`,
          borderRadius: wrapper.borderRadius as string,
          overflow: "hidden",
          background: "rgba(255, 255, 255, 0.18)",
          border: "2.5px solid rgba(36, 250, 255, 0.16)",
          boxShadow: isMobile
            ? "0 0 18px 2px #00fff922, 0 2px 10px #10c9e540"
            : "0 0 56px 18px #00fff944, 0 8px 30px #10c9e5b0",
          padding: isMobile ? "18px 16px" : "32px 28px",
          color: "#fff",
          pointerEvents: "auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "left",
        }}
      >
        <div style={{ width: "100%", maxWidth: 960 }}>{children}</div>
      </motion.div>
    </div>
  );
}
