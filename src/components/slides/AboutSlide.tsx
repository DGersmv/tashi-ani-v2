"use client";

import React from "react";
import { motion } from "framer-motion";
import { useFullPageScroll } from "@/components/FullPageScroll";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function AboutSlide({ index = 1 }: { index?: number }) {
  const { currentIndex } = useFullPageScroll();
  const isActive = currentIndex === index;
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        background: "#13150F",
        padding: "clamp(40px, 6vw, 80px) clamp(24px, 5vw, 52px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 60,
          maxWidth: 1200,
          width: "100%",
          alignItems: "center",
        }}
      >
        {/* Левый столбец */}
        <motion.div
          variants={container}
          initial="hidden"
          animate={isActive ? "show" : "hidden"}
          style={{ maxWidth: 520 }}
        >
          <motion.div
            variants={item}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              marginBottom: 20,
              fontSize: "0.6rem",
              letterSpacing: "0.26em",
              textTransform: "uppercase",
              color: "var(--gold)",
            }}
          >
            <span style={{ width: 30, height: 1, background: "var(--gold)" }} />
            О нас
          </motion.div>
          <motion.h2
            variants={item}
            style={{
              fontFamily: "var(--font-cormorant), serif",
              fontSize: "clamp(2.2rem, 4vw, 3.6rem)",
              fontWeight: 300,
              lineHeight: 1.15,
              color: "var(--warm-white)",
              marginBottom: 22,
            }}
          >
            Архитектурный<br />подход к <em style={{ fontStyle: "italic", color: "var(--sage)" }}>природе</em>
          </motion.h2>
          <motion.p
            variants={item}
            style={{
              fontSize: "0.95rem",
              lineHeight: 1.8,
              color: "var(--stone)",
              marginBottom: 24,
            }}
          >
            Архитектурное образование, 15 лет практики и искреннее увлечение своим делом — вот что стоит за каждым нашим проектом.
          </motion.p>
          <motion.div
            variants={item}
            style={{
              marginTop: 36,
              padding: "20px 22px",
              background: "rgba(255,255,255,.04)",
              borderLeft: "2px solid var(--gold)",
              backdropFilter: "blur(4px)",
              maxWidth: 440,
            }}
          >
            <p style={{ fontFamily: "var(--font-cormorant), serif", fontStyle: "italic", fontSize: "1.05rem", color: "var(--cream)", lineHeight: 1.55 }}>
              Каждый участок уникален. Мы не тиражируем решения — ищем именно вашу историю места.
            </p>
          </motion.div>
        </motion.div>

        {/* Правый столбец — карта-плейсхолдер */}
        <motion.div
          variants={container}
          initial="hidden"
          animate={isActive ? "show" : "hidden"}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}
        >
          <motion.div
            variants={item}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              marginBottom: 12,
              fontSize: "0.6rem",
              letterSpacing: "0.26em",
              textTransform: "uppercase",
              color: "var(--gold)",
              alignSelf: "flex-start",
            }}
          >
            <span style={{ width: 30, height: 1, background: "var(--gold)" }} />
            Наши проекты на карте
          </motion.div>
          <motion.div
            variants={item}
            style={{
              width: "100%",
              maxWidth: 420,
              aspectRatio: "1/1",
              background: "rgba(28,27,22,0.6)",
              border: "1px solid rgba(201,169,110,.2)",
              borderRadius: 8,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <svg width="100%" height="100%" style={{ opacity: 0.4 }}>
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(201,169,110,0.15)" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
            {[0.25, 0.4, 0.55, 0.7, 0.35, 0.6, 0.5].map((x, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: `${x * 100}%`,
                  top: `${(0.2 + (i * 0.12) % 0.6) * 100}%`,
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "var(--gold)",
                  boxShadow: "0 0 12px var(--gold)",
                  animation: "aboutDotPulse 2s ease-in-out infinite",
                  animationDelay: `${i * 0.2}s`,
                }}
              />
            ))}
            <style>{`
              @keyframes aboutDotPulse {
                0%, 100% { opacity: 0.7; transform: scale(1); }
                50% { opacity: 1; transform: scale(1.2); }
              }
            `}</style>
          </motion.div>
          <motion.p variants={item} style={{ fontSize: "0.7rem", color: "var(--stone)", opacity: 0.7 }}>
            {/* TODO: заменить на реальную карту */}
          </motion.p>
          <motion.div variants={item} style={{ display: "flex", gap: 24, marginTop: 8 }}>
            {[
              { n: "200+", l: "проектов" },
              { n: "6", l: "районов" },
              { n: "15+", l: "лет" },
            ].map((s) => (
              <div key={s.l} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-cormorant), serif", fontSize: "1.5rem", color: "var(--gold)" }}>{s.n}</div>
                <div style={{ fontSize: "0.58rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--stone)" }}>{s.l}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
