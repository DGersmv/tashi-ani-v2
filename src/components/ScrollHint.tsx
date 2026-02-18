"use client";

import React from "react";
import { useFullPageScroll } from "@/components/FullPageScroll";

export default function ScrollHint() {
  const { currentIndex, totalSlides } = useFullPageScroll();

  if (totalSlides <= 1) return null;

  const isLastSlide = currentIndex === totalSlides - 1;
  if (isLastSlide) return null;
  const isFirstSlide = currentIndex === 0;

  // Hero (0): только сверху вниз
  // Середина (1, 2, ...): чередование — чётные сверху-вниз, нечётные снизу-вверх
  // Футер (последний): только снизу вверх
  const origin = isFirstSlide ? "top" : currentIndex % 2 === 0 ? "top" : "bottom";

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        bottom: 28,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 150,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
      }}
    >
      <div
        className={`scroll-hint-line scroll-hint-line--${origin}`}
        style={{
          width: 1,
          height: 40,
          background: "linear-gradient(to bottom, var(--gold), transparent)",
          transformOrigin: origin === "top" ? "top" : "bottom",
        }}
      />
      <span
        style={{
          fontSize: "0.6rem",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "var(--gold)",
          opacity: 0.8,
        }}
      >
        Листать
      </span>
      <style>{`
        .scroll-hint-line {
          animation: scrollHintLine 2s ease-in-out infinite;
        }
        .scroll-hint-line--top {
          transform-origin: top;
        }
        .scroll-hint-line--bottom {
          transform-origin: bottom;
        }
        @keyframes scrollHintLine {
          0%, 100% { transform: scaleY(0); }
          50% { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}
