"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { createPortal } from "react-dom";

type Item = { file: string; type: "image" | "video"; captionRu?: string; captionEn?: string };
type Project = { name: string; description?: string; items: Item[] };

function normalizeSrc(src: string) {
  return src.startsWith("/") ? src : `/${src.replace(/^\.?\//, "")}`;
}

export default function PhotoGlassPanel({ project }: { project: Project }) {
  const items = useMemo(() => project.items ?? [], [project.items]);
  const cover = items[0];
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);

  // блокируем скролл фона, пока открыт лайтбокс
  useEffect(() => {
    if (!open) return;
    const sbw = window.innerWidth - document.documentElement.clientWidth;
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    const prevPad = document.body.style.paddingRight;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    if (sbw > 0) document.body.style.paddingRight = `${sbw}px`;
    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
      document.body.style.paddingRight = prevPad;
    };
  }, [open]);

  // клавиатура в лайтбоксе
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowLeft") setIdx((k) => (k - 1 + items.length) % items.length);
      if (e.key === "ArrowRight") setIdx((k) => (k + 1) % items.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, items.length]);

  return (
    <div className="panelWrapper">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.44, 0.13, 0.35, 1.08] }}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          borderRadius: "inherit",
          overflow: "hidden",
          pointerEvents: "auto",
        }}
      >
        <motion.div
          className="group"
          onClick={() => { if (items.length) { setIdx(0); setOpen(true); } }}
          whileHover={{ y: -6, scale: 1.015, filter: "saturate(1.06)" }}
          transition={{ type: "spring", stiffness: 220, damping: 20 }}
          style={{
            position: "absolute",
            inset: 5,
            borderRadius: "inherit",
            overflow: "hidden",
            background: "rgba(250, 247, 242, 0.15)",
            backdropFilter: "blur(32px)", // стеклянный эффект
            border: "2.5px solid rgba(211,163,115,0.6)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "stretch",
            cursor: items.length ? "pointer" : "default",
          }}
        >
          {/* фон-постер */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: cover ? `url(${normalizeSrc(cover.file)})` : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "saturate(105%) brightness(0.9)",
              transform: "scale(1)",
              transition: "transform .6s",
              pointerEvents: "none",
            }}
            className="group-hover:scale-[1.03]"
          />
          {/* вуаль */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to top, rgba(0,0,0,.55), rgba(0,0,0,.25))",
              pointerEvents: "none",
            }}
          />
          {/* подписи */}
          <div
            style={{
              position: "relative",
              zIndex: 2,
              width: "100%",
              padding: "16px 18px",
              color: "white",
              display: "grid",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <h3 style={{ fontWeight: 800, fontSize: "1.1rem", lineHeight: 1.2 }}>{project.name}</h3>
              <span
                style={{
                  background: "rgba(0,0,0,.45)",
                  padding: "4px 8px",
                  borderRadius: 999,
                  fontSize: 12,
                  whiteSpace: "nowrap",
                }}
              >
                {items.length} файлов
              </span>
            </div>
            {project.description && (
              <p style={{ fontSize: 14, color: "rgba(250, 247, 242, .9)" }}>{project.description}</p>
            )}
            <div style={{ justifySelf: "end", opacity: .9, fontSize: 14 }}>Нажмите, чтобы открыть →</div>
          </div>
        </motion.div>
      </motion.div>

      {/* Лайтбокс через портал (над всеми слоями) */}
      {open &&
        createPortal(
          <div
            className="lightbox"
            role="dialog"
            aria-modal="true"
            onClick={() => setOpen(false)}
          >
            <button
              className="nav left"
              aria-label="Предыдущее"
              onClick={(e) => { e.stopPropagation(); setIdx((k) => (k - 1 + items.length) % items.length); }}
            >⟨</button>

            {items[idx]?.type === "video" ? (
              <video
                key={items[idx].file}
                src={normalizeSrc(items[idx].file)}
                className="media"
                controls
                autoPlay
                loop
                playsInline
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <img
                key={items[idx]?.file || "empty"}
                src={normalizeSrc(items[idx]?.file || "/placeholder.png")}
                alt={items[idx]?.captionRu || items[idx]?.captionEn || "Изображение портфолио"}
                className="media"
                onClick={(e) => e.stopPropagation()}
                onError={(e) => ((e.currentTarget as HTMLImageElement).src = "/placeholder.png")}
              />
            )}

            <div className="caption">
              {items[idx]?.captionRu || items[idx]?.captionEn || items[idx]?.file?.replace(/^\/portfolio\//, "")}
            </div>

            <button
              className="nav right"
              aria-label="Следующее"
              onClick={(e) => { e.stopPropagation(); setIdx((k) => (k + 1) % items.length); }}
            >⟩</button>

            <button className="close" aria-label="Закрыть" onClick={(e) => { e.stopPropagation(); setOpen(false); }}>✕</button>
          </div>,
          document.body
        )
      }

<style jsx>{`
  .panelWrapper {
    width: 100%;
    border-radius: 1.2rem;
    /* соотношение: ширина / высота = 1.41 (ширина больше высоты в 1.41 раза) */
    aspect-ratio: 1.41 / 1;
  }

  .lightbox {
    position: fixed; inset: 0; z-index: 9999;
    background: rgba(0,0,0,.9);
    display: flex; align-items: center; justify-content: center;
    overscroll-behavior: contain;
  }
  .media {
    max-width: 92vw; max-height: 90vh;
    object-fit: contain; border-radius: 16px;
    box-shadow: 0 20px 60px rgba(0,0,0,.55);
  }
  .caption {
    position: absolute; bottom: 24px; left: 50%;
    transform: translateX(-50%);
    color: #e5e7eb; font-size: 14px; text-align: center; padding: 0 18px;
  }
  .nav {
    position: absolute; top: 50%; transform: translateY(-50%);
    background: rgba(0,0,0,.5); color: white; border-radius: 999px;
    font-size: 32px; padding: 6px 12px; line-height: 1;
  }
  .nav.left { left: 16px; }
  .nav.right { right: 16px; }
  .close {
    position: absolute; top: 16px; right: 16px;
    background: rgba(0,0,0,.5); color: white; border-radius: 999px;
    font-size: 28px; padding: 6px 10px; line-height: 1;
  }
`}</style>
    </div>
  );
}
