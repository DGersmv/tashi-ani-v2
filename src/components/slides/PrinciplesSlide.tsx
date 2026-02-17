"use client";

import React from "react";
import { motion } from "framer-motion";
import { useFullPageScroll } from "@/components/FullPageScroll";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const cards = [
  {
    num: "01",
    title: "Логика пространства",
    text: "Каждое решение обоснованно. Проектируем участок как единую систему, где все элементы связаны функционально и визуально.",
  },
  {
    num: "02",
    title: "Функциональность",
    text: "Красота без удобства не имеет смысла. Создаём пространства, комфортные в использовании каждый день весь сезон.",
  },
  {
    num: "03",
    title: "Эстетика",
    text: "Подбор растений по цвету, текстуре и сезонности. Только проверенный ассортимент для Северо-Западного региона.",
  },
];

export default function PrinciplesSlide({ index = 2 }: { index?: number }) {
  const { currentIndex } = useFullPageScroll();
  const isActive = currentIndex === index;
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        background: "#161510",
        padding: "clamp(40px, 6vw, 80px) clamp(24px, 5vw, 52px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <motion.div
        variants={container}
        initial="hidden"
        animate={isActive ? "show" : "hidden"}
        style={{ width: "100%", maxWidth: 1200 }}
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
          Наши принципы
        </motion.div>
        <motion.h2
          variants={item}
          style={{
            fontFamily: "var(--font-cormorant), serif",
            fontSize: "clamp(2.2rem, 4vw, 3.6rem)",
            fontWeight: 300,
            lineHeight: 1.15,
            color: "var(--warm-white)",
            marginBottom: 40,
          }}
        >
          Три основы каждого проекта
        </motion.h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 2,
            width: "100%",
          }}
        >
          {cards.map((c, i) => (
            <motion.div
              key={c.num}
              variants={item}
              className="principles-card"
              style={{
                padding: "36px 32px",
                background: "rgba(255,255,255,.025)",
                borderTop: "1px solid rgba(201,169,110,.13)",
                position: "relative",
                overflow: "hidden",
                transition: "background 0.4s",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-cormorant), serif",
                  fontSize: "3.4rem",
                  fontWeight: 300,
                  color: "rgba(201,169,110,0.1)",
                  lineHeight: 1,
                  display: "block",
                  marginBottom: 16,
                }}
              >
                {c.num}
              </span>
              <div
                style={{
                  fontFamily: "var(--font-cormorant), serif",
                  fontSize: "1.45rem",
                  fontWeight: 400,
                  color: "var(--warm-white)",
                  marginBottom: 12,
                }}
              >
                {c.title}
              </div>
              <p
                style={{
                  fontSize: "0.82rem",
                  lineHeight: 1.75,
                  color: "var(--stone)",
                }}
              >
                {c.text}
              </p>
              <div
                aria-hidden
                className="principles-card-line"
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: "100%",
                  height: 1,
                  background: "var(--gold)",
                  transition: "right 0.5s",
                }}
              />
            </motion.div>
          ))}
        </div>
      </motion.div>

      <style>{`
        .principles-card:hover {
          background: rgba(58,82,54,0.1);
        }
        .principles-card:hover .principles-card-line {
          right: 0;
        }
      `}</style>
    </div>
  );
}
