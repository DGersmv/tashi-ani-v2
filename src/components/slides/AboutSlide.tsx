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
          maxWidth: 600,
          width: "100%",
          margin: "0 auto",
        }}
      >
        <motion.div
          variants={container}
          initial="hidden"
          animate={isActive ? "show" : "hidden"}
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
      </div>
    </div>
  );
}
