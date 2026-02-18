"use client";

import React from "react";
import { motion } from "framer-motion";
import { useFullPageScroll } from "@/components/FullPageScroll";
import OpenGlobusViewer from "@/components/OpenGlobusViewer";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.15 },
  },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

export default function HeroSlide({ index = 0 }: { index?: number }) {
  const { goTo, currentIndex } = useFullPageScroll();
  const isActive = currentIndex === index;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Фон: градиенты + анимация дыхания */}
      <div
        className="hero-bg"
        style={{
          position: "absolute",
          inset: 0,
          background: `
            radial-gradient(ellipse at 65% 35%, rgba(58,82,54,.65) 0%, transparent 55%),
            radial-gradient(ellipse at 18% 75%, rgba(122,158,114,.2) 0%, transparent 50%),
            linear-gradient(165deg, #0B0E08 0%, #141a0f 35%, #1e2a16 65%, #1C1B16 100%)
          `,
          animation: "heroBreathe 9s ease-in-out infinite alternate",
        }}
      />
      <style>{`
        @keyframes heroBreathe {
          from { transform: scale(1); }
          to { transform: scale(1.04); }
        }
      `}</style>

      {/* Вертикальная линия */}
      <div
        style={{
          position: "absolute",
          right: "26%",
          top: 0,
          bottom: 0,
          width: 1,
          background: "linear-gradient(to bottom, transparent, rgba(201,169,110,.16) 40%, transparent)",
          zIndex: 1,
        }}
      />

      {/* Контент */}
      <motion.div
        variants={container}
        initial="hidden"
        animate={isActive ? "show" : "hidden"}
        style={{
          position: "relative",
          zIndex: 2,
          width: "100%",
          height: "100%",
          padding: "0 clamp(24px, 5vw, 52px)",
          display: "flex",
          alignItems: "center",
          gap: 40,
        }}
      >
        <div style={{ width: "50%", flexShrink: 0 }}>
          <motion.div
            variants={item}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              marginBottom: 24,
              fontSize: "0.6rem",
              letterSpacing: "0.26em",
              textTransform: "uppercase",
              color: "var(--gold)",
            }}
          >
            <span style={{ width: 30, height: 1, background: "var(--gold)" }} />
            Ландшафтная студия · Санкт-Петербург
          </motion.div>
          <motion.h1
            variants={item}
            style={{
              fontFamily: "var(--font-cormorant), serif",
              fontSize: "clamp(3.2rem, 6.5vw, 6.5rem)",
              fontWeight: 300,
              lineHeight: 1.02,
              color: "var(--warm-white)",
              marginBottom: 28,
            }}
          >
            Ландшафт, который <em style={{ fontStyle: "italic", color: "var(--sage)" }}>рекомендуют</em>
          </motion.h1>
          <motion.p
            variants={item}
            style={{
              fontSize: "0.95rem",
              lineHeight: 1.8,
              color: "var(--stone)",
              marginBottom: 40,
            }}
          >
            Создаём пространства, которые работают на ваш стиль жизни. Уже более 15 лет — только реальные решения для нашего климата.
          </motion.p>
          <motion.div variants={item} style={{ display: "flex", gap: 22, alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => goTo(7)}
              style={{
                padding: "14px 32px",
                background: "var(--moss)",
                border: "1px solid var(--sage)",
                color: "var(--cream)",
                fontFamily: "var(--font-jost), sans-serif",
                fontSize: "0.7rem",
                fontWeight: 400,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                cursor: "none",
              }}
            >
              Обсудить проект →
            </button>
            <button
              type="button"
              onClick={() => goTo(4)}
              style={{
                fontSize: "0.7rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--stone)",
                background: "none",
                border: "none",
                cursor: "none",
                fontFamily: "var(--font-jost), sans-serif",
              }}
            >
              Смотреть портфолио →
            </button>
          </motion.div>
        </div>

        {/* Карта с планетой, анимацией, точками и логотипами */}
        <motion.div
          variants={item}
          style={{
            flex: 1,
            aspectRatio: "4 / 3",
            minHeight: 320,
            maxHeight: "55vh",
            background: "rgba(28,27,22,0.6)",
            border: "1px solid rgba(201,169,110,.2)",
            borderRadius: 8,
            position: "relative",
            overflow: "hidden",
            maxWidth: 520,
          }}
        >
          <OpenGlobusViewer ready={isActive} />
        </motion.div>
      </motion.div>

      {/* Статистика справа внизу */}
      <motion.div
        variants={item}
        initial="hidden"
        animate={isActive ? "show" : "hidden"}
        style={{
          position: "absolute",
          right: "clamp(24px, 5vw, 52px)",
          bottom: 60,
          display: "flex",
          flexDirection: "column",
          gap: 26,
          zIndex: 2,
        }}
      >
        {[
          { n: "15+", l: "лет опыта" },
          { n: "90%", l: "рекомендаций" },
          { n: "200+", l: "проектов" },
        ].map((s) => (
          <div
            key={s.l}
            style={{
              textAlign: "right",
              borderRight: "1px solid rgba(201,169,110,.25)",
              paddingRight: 16,
            }}
          >
            <div style={{ fontFamily: "var(--font-cormorant), serif", fontSize: "2.2rem", fontWeight: 300, color: "var(--gold)", lineHeight: 1 }}>
              {s.n}
            </div>
            <div style={{ fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--stone)", marginTop: 3 }}>
              {s.l}
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
