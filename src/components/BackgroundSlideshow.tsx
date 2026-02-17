"use client";
import { useEffect, useState } from "react";

type Props = {
  intervalMs?: number;
  fadeMs?: number;
  kenBurns?: boolean;
};

export default function BackgroundSlideshow({
  intervalMs = 7000,
  fadeMs = 1200,
  kenBurns = true,
}: Props) {
  const [images, setImages] = useState<string[]>([]);
  const [index, setIndex] = useState(0);

  // 1) тянем список из API (как было)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/bg", { cache: "no-store" });
        const data = (await res.json()) as { images: string[] };
        if (mounted) setImages(Array.isArray(data.images) ? data.images : []);
      } catch {
        if (mounted) setImages([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // 2) цикл по кругу (как было)
  useEffect(() => {
    if (images.length < 2) return;
    const id = setInterval(
      () => setIndex((i) => (i + 1) % images.length),
      intervalMs
    );
    return () => clearInterval(id);
  }, [images, intervalMs]);

  // 3) предзагрузка следующего кадра (как было)
  useEffect(() => {
    if (!images.length) return;
    const next = images[(index + 1) % images.length];
    const img = new Image();
    img.decoding = "async";
    img.loading = "eager";
    img.src = next;
  }, [index, images]);

  // 4) плейсхолдер
  if (images.length === 0) {
    return (
      <div
        aria-hidden
        style={{ position: "fixed", inset: 0, zIndex: -1, background: "#000" }}
      />
    );
  }

  const active = images[index];

  return (
    <div
      aria-hidden
      className="gpu fixed-layer"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: -1,
        overflow: "hidden",
        background: "#000",
        pointerEvents: "none",
      }}
    >
      {images.map((src) => {
        const isActive = src === active;
        return (
          <img
            key={src}
            src={src}
            alt=""
            draggable={false}
            decoding="async"
            loading={isActive ? "eager" : "lazy"}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: isActive ? 1 : 0,
              // Ken Burns только на активном кадре (transform → композитинг на GPU)
              transform: isActive && kenBurns ? "scale(1.04)" : "scale(1)",
              transformOrigin: "center center",
              transitionProperty: "opacity, transform",
              transitionDuration: `${fadeMs}ms, ${Math.max(
                1000,
                intervalMs - 300
              )}ms`,
              transitionTimingFunction: "ease-in-out, ease-in-out",
              willChange: "opacity, transform",
              // ВАЖНО: не используем filter на самих <img> — это вызывает тяжёлые репейнты
              // filter: "contrast(1.02) saturate(1.02)",
            }}
          />
        );
      })}

      {/* мягкое затемнение отдельным слоем (дёшево для композитора) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(0,0,0,.42), rgba(0,0,0,.64))",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
