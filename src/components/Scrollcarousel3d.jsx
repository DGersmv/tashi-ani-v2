"use client";
import { useRef, useEffect, useState } from "react";
import {
  motion,
  useVelocity,
  useTransform,
  useSpring,
  useMotionValue,
  AnimatePresence,
} from "framer-motion";

// ─── Дефолтные фото ────────────────────────────────────────────────────────────
const DEFAULT_IMAGES = [
  { src: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80", title: "SHADOW I" },
  { src: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&q=80", title: "MOTION II" },
  { src: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=80", title: "ECHO III" },
  { src: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80", title: "VEIL IV" },
  { src: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800&q=80", title: "SOUL V" },
  { src: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&q=80", title: "GLOW VI" },
  { src: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&q=80", title: "WAVE VII" },
];

// ─── Константы — настройте под себя ───────────────────────────────────────────
const TOTAL_CARDS = 20;    // количество карточек
const CARD_W = 280;        // ширина карточки в px
const CARD_H = 400;        // высота карточки в px
const STEP_X = 180;        // шаг между карточками по X
const STEP_Y = -120;       // шаг между карточками по Y
const STEP_Z = -220;       // шаг между карточками по Z (глубина)
const LINE_X = -200;       // смещение линии: < 0 влево, > 0 вправо
const LINE_Y = 80;         // смещение линии: < 0 вверх, > 0 вниз
const MODAL_PAD_X = 80;   // отступ слева/справа когда карточка открыта
const MODAL_PAD_Y = 60;   // отступ сверху/снизу когда карточка открыта

// ─── Card ──────────────────────────────────────────────────────────────────────
function Card({ src, label, cardIndex, title, velX, isOpen, anyOpen, onOpen, onClose, scrollVal, winW, winH }) {
  const [hovered, setHovered] = useState(false);
  useEffect(() => { if (anyOpen && !isOpen) setHovered(false); }, [anyOpen, isOpen]);

  const wobbleY = useTransform(velX, [-600, 0, 600], [14, 0, -14]);

  const offset = cardIndex - scrollVal;
  const cx = offset * STEP_X - CARD_W / 2;
  const cy = offset * STEP_Y - CARD_H / 2;
  const cz = offset * STEP_Z;

  const dist = Math.abs(offset);
  const distOpacity = Math.max(0, 1 - Math.max(0, dist - 2.5) * 0.4);

  const availW = winW - MODAL_PAD_X * 2;
  const availH = winH - MODAL_PAD_Y * 2;
  // Не увеличиваем карточку больше оригинального размера
  const modalScale = Math.min(1, Math.min(availW / CARD_W, availH / CARD_H));
  
  // Центрируем карточку при раскрытии: внешний контейнер сам переходит в translate(-50%, -50%)  
  // (сдвиг при открытии больше не используется)

  return (
    <div style={{
      position: "absolute",
      left: "50%", top: "50%",
      width: CARD_W, height: CARD_H,
      transform: isOpen
        ? "translate(-50%, -50%)"                                    // центрируем при раскрытии
        : `translate3d(${cx}px, ${cy}px, ${cz}px)`,
      zIndex: isOpen ? 9999 : Math.round(dist < 10 ? 1000 - dist * 10 : 0),
    }}>
      <motion.div
        style={{ width: "100%", height: "100%" }}
        animate={isOpen ? {
          rotateY: 0, rotateX: 0,
          scale: modalScale,
          z: 500, opacity: 1,
        } : anyOpen ? {
          rotateY: 45, rotateX: -15,
          scale: 0.95, z: 0, x: 0, y: 0,
          opacity: 0.08,
        } : {
          rotateY: 45, rotateX: -15,
          scale: 1, z: 0, x: 0, y: 0,
          opacity: distOpacity,
        }}
        transition={isOpen
          ? { type: "spring", stiffness: 100, damping: 18 }
          : { type: "spring", stiffness: 220, damping: 30 }
        }
      >
        <motion.div style={{
          width: "100%", height: "100%",
          rotateY: isOpen || anyOpen ? 0 : wobbleY,
        }}>
          <div
            onMouseEnter={() => !anyOpen && setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={(e) => {
              if (isOpen) { e.stopPropagation(); setHovered(false); onClose(); }
              else if (!anyOpen) { onOpen(cardIndex); }
            }}
            style={{
              width: "100%", height: "100%",
              borderRadius: 4, overflow: "hidden", position: "relative",
              border: `1px solid ${isOpen ? "rgba(255,255,255,0.18)" : hovered ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.08)"}`,
              boxShadow: isOpen
                ? "0 80px 160px rgba(0,0,0,0.98)"
                : hovered ? "0 40px 100px rgba(0,0,0,0.88)"
                : "0 30px 80px rgba(0,0,0,0.72)",
              cursor: isOpen ? "zoom-out" : anyOpen ? "default" : "pointer",
              transform: !isOpen && !anyOpen && hovered ? "scale(1.04)" : "scale(1)",
              transition: "box-shadow 0.3s, border-color 0.3s, transform 0.3s",
            }}
          >
            <img src={src} alt={label} draggable={false} style={{
              width: "100%", height: "100%", objectFit: "cover", display: "block",
              transform: isOpen || hovered ? "scale(1.05)" : "scale(1)",
              transition: "transform 0.6s cubic-bezier(0.25,0.46,0.45,0.94)",
            }} />

            <div style={{
              position: "absolute", inset: 0,
              background: isOpen
                ? "linear-gradient(to top, rgba(5,5,5,0.96) 0%, transparent 55%)"
                : "linear-gradient(135deg, transparent 40%, rgba(0,0,0,0.6) 100%)",
              transition: "background 0.5s",
            }} />

            <div style={{
              position: "absolute", top: 0, left: 0, bottom: 0, width: 2,
              background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.13), transparent)",
            }} />

            <span style={{
              position: "absolute", bottom: 16, right: 18,
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 13, letterSpacing: "0.22em",
              color: "rgba(232,232,224,0.4)",
            }}>{label}</span>

            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ y: 28, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 28, opacity: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                  style={{
                    position: "absolute", bottom: 0, left: 0, right: 0,
                    padding: "22px 18px 20px",
                    pointerEvents: "none",
                  }}
                >
                  <p style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 7, letterSpacing: "0.22em", textTransform: "uppercase",
                    color: "rgba(232,226,216,0.38)", marginBottom: 7,
                  }}>Heritage · FW 25/26</p>
                  <h2 style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: 30, letterSpacing: "0.04em", lineHeight: 1,
                    color: "#e8e2d8", marginBottom: 14,
                  }}>{title}</h2>
                  <div style={{ height: 1, background: "rgba(232,226,216,0.1)", marginBottom: 12 }} />
                  <p style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 7, letterSpacing: "0.18em", textTransform: "uppercase",
                    color: "rgba(232,226,216,0.22)",
                  }}>Click to close · ESC</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function DiagonalCarousel({ images = DEFAULT_IMAGES }) {
  const N = images.length;
  const [openId, setOpenId] = useState(null);
  const frozen = openId !== null;
  const containerRef = useRef(null);

  const [winW, setWinW] = useState(typeof window !== "undefined" ? window.innerWidth : 1440);
  const [winH, setWinH] = useState(typeof window !== "undefined" ? window.innerHeight : 900);
  useEffect(() => {
    const fn = () => { setWinW(window.innerWidth); setWinH(window.innerHeight); };
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  const scrollT = useMotionValue(TOTAL_CARDS / 2);
  const springScrollT = useSpring(scrollT, { stiffness: 80, damping: 22 });
  const velX = useVelocity(springScrollT);
  const smoothVelX = useSpring(velX, { damping: 22, stiffness: 140 });

  const [scrollVal, setScrollVal] = useState(TOTAL_CARDS / 2);
  useEffect(() => {
    const unsub = springScrollT.on("change", setScrollVal);
    return () => unsub();
  }, []);

  const activeDot = useTransform(springScrollT, (t) =>
    ((Math.round(t) % TOTAL_CARDS) + TOTAL_CARDS) % TOTAL_CARDS
  );

  const onWheel = (e) => {
    if (frozen) return;
    e.preventDefault();
    e.stopPropagation();
    const next = Math.max(0, Math.min(TOTAL_CARDS - 1, scrollT.get() + e.deltaY * 0.008));
    scrollT.set(next);
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [frozen]);

  useEffect(() => {
    const fn = (e) => { if (e.key === "Escape") setOpenId(null); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);

  const allCards = Array.from({ length: TOTAL_CARDS }, (_, i) => ({
    cardIndex: i,
    ...images[i % N],
    label: String((i % N) + 1).padStart(2, "0"),
  }));

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:wght@300;400&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: transparent; overflow: hidden; height: 100vh; }
        .grain {
          position: fixed; inset: 0; pointer-events: none; z-index: 500; opacity: 0.04;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-size: 160px;
        }
        .root { width: 100vw; height: 100vh; position: relative; }
        .bottom-bar {
          position: absolute; bottom: 0; left: 0; right: 0; padding: 32px 56px;
          display: flex; justify-content: space-between; align-items: flex-end;
          z-index: 100; pointer-events: none; transition: opacity 0.4s;
        }
        .bottom-bar.frozen { opacity: 0.08; pointer-events: none; }
        .hint {
          display: flex; align-items: center; gap: 14px; font-family: 'DM Mono', monospace;
          font-size: 9px; letter-spacing: 0.24em; text-transform: uppercase; color: rgba(232,226,216,0.2);
        }
        .hint-line { width: 40px; height: 1px; background: rgba(232,226,216,0.1); position: relative; overflow: hidden; }
        .hint-line::after {
          content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%;
          background: rgba(232,226,216,0.55); animation: sweep 2.4s ease-in-out infinite;
        }
        @keyframes sweep { 0%{left:-100%} 100%{left:100%} }
        .count { font-family: 'Bebas Neue', sans-serif; font-size: 11px; letter-spacing: 0.28em; color: rgba(232,226,216,0.16); }
        .stage {
          width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
          perspective: 1100px; cursor: default;
        }
        .world { position: relative; width: 1px; height: 1px; transform-style: preserve-3d; }
      `}</style>

      <div className="root">
        <div className="grain" />

        {frozen && (
          <div onClick={() => setOpenId(null)} style={{
            position: "fixed", inset: 0, zIndex: 100, cursor: "zoom-out",
          }} />
        )}

        <div className="stage" ref={containerRef}>
          <motion.div
            className="world"
            style={{
              x: LINE_X, y: LINE_Y,
              transformStyle: "preserve-3d",
            }}
          >
            {allCards.map(({ cardIndex, src, label, title }) => (
              <Card
                key={cardIndex}
                src={src} label={label} title={title}
                cardIndex={cardIndex}
                velX={smoothVelX}
                isOpen={openId === cardIndex}
                anyOpen={frozen}
                onOpen={setOpenId}
                onClose={() => setOpenId(null)}
                scrollVal={scrollVal}
                winW={winW}
                winH={winH}
              />
            ))}
          </motion.div>
        </div>

        <div className={`bottom-bar${frozen ? " frozen" : ""}`}>
          <div className="hint">
            <div className="hint-line" />
            {frozen ? "ESC or click to close" : "Click · Scroll"}
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 12, pointerEvents: frozen ? "none" : "auto" }}>
            <div style={{ display: "flex", gap: 6 }}>
              {Array.from({ length: TOTAL_CARDS }, (_, i) => (
                <motion.div key={i}
                  onClick={() => scrollT.set(i)}
                  style={{
                    width: 5, height: 5, borderRadius: "50%", cursor: "pointer",
                    backgroundColor: useTransform(activeDot, (a) => Math.round(a) === i ? "rgba(232,226,216,0.9)" : "rgba(232,226,216,0.2)"),
                    scale: useTransform(activeDot, (a) => Math.round(a) === i ? 1.5 : 1),
                  }}
                />
              ))}
            </div>
            <span className="count">{TOTAL_CARDS} LOOKS · ∞</span>
          </div>
        </div>
      </div>
    </>
  );
}