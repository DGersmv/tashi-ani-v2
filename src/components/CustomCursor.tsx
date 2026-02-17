"use client";

import React, { useEffect, useRef, useState } from "react";

const LERP = 0.12;
const GOLD = "#C9A96E";

export default function CustomCursor() {
  const [mounted, setMounted] = useState(false);
  const [isTouch, setIsTouch] = useState(true);
  const [visible, setVisible] = useState(false);
  const [isHover, setIsHover] = useState(false);
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 0, y: 0 });
  const ringPos = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number>(0);

  useEffect(() => {
    setMounted(true);
    setIsTouch(typeof window !== "undefined" && window.navigator.maxTouchPoints > 0);
  }, []);

  useEffect(() => {
    if (!mounted || isTouch) return;
    document.body.classList.add("has-custom-cursor");
    return () => document.body.classList.remove("has-custom-cursor");
  }, [mounted, isTouch]);

  useEffect(() => {
    if (!mounted || typeof window === "undefined" || isTouch) return;

    const handleMove = (e: MouseEvent) => {
      pos.current = { x: e.clientX, y: e.clientY };
      if (!visible) setVisible(true);
    };

    const handleOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target?.closest?.("a") || target?.closest?.("button")) {
        setIsHover(true);
      }
    };

    const handleOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const related = e.relatedTarget as HTMLElement;
      if (target?.closest?.("a") || target?.closest?.("button")) {
        if (!related?.closest?.("a") && !related?.closest?.("button")) {
          setIsHover(false);
        }
      }
    };

    const animate = () => {
      ringPos.current.x += (pos.current.x - ringPos.current.x) * LERP;
      ringPos.current.y += (pos.current.y - ringPos.current.y) * LERP;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${pos.current.x}px, ${pos.current.y}px) translate(-50%, -50%)`;
      }
      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${ringPos.current.x}px, ${ringPos.current.y}px) translate(-50%, -50%)`;
      }
      rafRef.current = requestAnimationFrame(animate);
    };

    ringPos.current = { x: pos.current.x, y: pos.current.y };
    rafRef.current = requestAnimationFrame(animate);

    window.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseover", handleOver);
    document.addEventListener("mouseout", handleOut);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseover", handleOver);
      document.removeEventListener("mouseout", handleOut);
      cancelAnimationFrame(rafRef.current);
    };
  }, [mounted, isTouch, visible]);

  if (!mounted || isTouch) return null;

  const dotSize = isHover ? 20 : 10;
  const ringSize = isHover ? 56 : 36;

  return (
    <div
      className="custom-cursor"
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 9999,
        visibility: visible ? "visible" : "hidden",
      }}
      aria-hidden
    >
      {/* Точка — сразу за мышью */}
      <div
        ref={dotRef}
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          width: dotSize,
          height: dotSize,
          borderRadius: "50%",
          background: GOLD,
          mixBlendMode: "difference",
          transform: "translate(-50%, -50%)",
          transition: "width 0.2s, height 0.2s",
          zIndex: 2,
        }}
      />
      {/* Кружок — с задержкой (lerp) */}
      <div
        ref={ringRef}
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          width: ringSize,
          height: ringSize,
          borderRadius: "50%",
          border: "1px solid rgba(201, 169, 110, 0.65)",
          transform: "translate(-50%, -50%)",
          transition: "width 0.2s, height 0.2s",
          zIndex: 1,
        }}
      />
    </div>
  );
}
