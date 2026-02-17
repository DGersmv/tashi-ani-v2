"use client";

import React from "react";
import { useFullPageScroll } from "@/components/FullPageScroll";

export default function SlideNav() {
  const { totalSlides, currentIndex, goTo } = useFullPageScroll();

  const current = Math.min(currentIndex + 1, totalSlides);
  const total = totalSlides;
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div
      aria-label="Навигация по слайдам"
      style={{
        position: "fixed",
        right: 28,
        top: "50%",
        transform: "translateY(-50%)",
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
      }}
    >
      {Array.from({ length: total }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => goTo(i)}
          aria-label={`Слайд ${i + 1}`}
          aria-current={i === currentIndex ? "true" : undefined}
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            border: "none",
            padding: 0,
            cursor: "pointer",
            background: i === currentIndex ? "#C9A96E" : "rgba(201, 169, 110, 0.25)",
            transform: i === currentIndex ? "scale(1.5)" : "scale(1)",
            transition: "background 0.2s, transform 0.2s",
          }}
        />
      ))}
      <div
        style={{
          position: "fixed",
          right: 28,
          bottom: 28,
          zIndex: 100,
          fontFamily: "var(--font-jost), sans-serif",
          fontSize: 14,
          color: "rgba(201, 169, 110, 0.9)",
        }}
      >
        {pad(current)} / {pad(total)}
      </div>
    </div>
  );
}
