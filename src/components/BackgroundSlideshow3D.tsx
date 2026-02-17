"use client";
import { useEffect, useState, useRef } from "react";

type Props = {
  intervalMs?: number;
  fadeMs?: number;
  kenBurns?: boolean;
  enable3D?: boolean; // Включить 3D lens effect
  parallaxIntensity?: number; // Интенсивность эффекта (0-1)
};

export default function BackgroundSlideshow3D({
  intervalMs = 7000,
  fadeMs = 1200,
  kenBurns = true,
  enable3D = true,
  parallaxIntensity = 0.5,
}: Props) {
  const [images, setImages] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // 1) Загрузка изображений из API
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

  // 2) Цикл слайдшоу
  useEffect(() => {
    if (images.length < 2) return;
    const id = setInterval(
      () => setIndex((i) => (i + 1) % images.length),
      intervalMs
    );
    return () => clearInterval(id);
  }, [images, intervalMs]);

  // 3) Предзагрузка следующего кадра
  useEffect(() => {
    if (!images.length) return;
    const next = images[(index + 1) % images.length];
    const img = new Image();
    img.decoding = "async";
    img.loading = "eager";
    img.src = next;
  }, [index, images]);

  // 4) 3D lens effect - отслеживание движения мыши
  useEffect(() => {
    if (!enable3D || !containerRef.current) return;

    // Инициализируем CSS переменные
    document.documentElement.style.setProperty("--move-x", "0deg");
    document.documentElement.style.setProperty("--move-y", "0deg");

    const handleMouseMove = (e: MouseEvent) => {
      // Увеличиваем коэффициенты для более заметного эффекта
      const moveX = (e.clientX - window.innerWidth / 2) * -0.008 * parallaxIntensity;
      const moveY = (e.clientY - window.innerHeight / 2) * 0.015 * parallaxIntensity;
      
      document.documentElement.style.setProperty("--move-x", `${moveX}deg`);
      document.documentElement.style.setProperty("--move-y", `${moveY}deg`);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [enable3D, parallaxIntensity]);

  // 5) Плейсхолдер
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
      ref={containerRef}
      aria-hidden
      className="gpu fixed-layer parallax-3d-container"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: -1,
        overflow: "hidden",
        background: "#000",
        pointerEvents: "none",
        // 3D perspective для lens effect
        perspective: enable3D ? "1000px" : "none",
      }}
    >
      <div
        className="parallax-3d-wrapper"
        style={{
          width: "100%",
          height: "100%",
          transformStyle: "preserve-3d",
          transform: enable3D
            ? "rotateX(var(--move-y, 0deg)) rotateY(var(--move-x, 0deg))"
            : "none",
          transition: enable3D ? "transform 1.5s cubic-bezier(.05, .5, 0, 1)" : "none",
          willChange: enable3D ? "transform" : "auto",
          // Добавляем начальное значение для видимости эффекта
          ...(enable3D && {
            // Небольшой начальный наклон для демонстрации
          }),
        }}
      >
        {images.map((src) => {
          const isActive = src === active;
          return (
            <div
              key={src}
              className="parallax-layer"
              style={{
                position: "absolute",
                inset: "-5vw",
                width: "calc(100% + 10vw)",
                height: "calc(100% + 10vw)",
                transform: enable3D
                  ? "translateZ(-55px) scale(1.06)"
                  : "translateZ(0) scale(1)",
                transformStyle: "preserve-3d",
              }}
            >
              <img
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
                  // Ken Burns только на активном кадре
                  transform: isActive && kenBurns ? "scale(1.04)" : "scale(1)",
                  transformOrigin: "center center",
                  transitionProperty: "opacity, transform",
                  transitionDuration: `${fadeMs}ms, ${Math.max(
                    1000,
                    intervalMs - 300
                  )}ms`,
                  transitionTimingFunction: "ease-in-out, ease-in-out",
                  willChange: "opacity, transform",
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Мягкое затемнение отдельным слоем */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(0,0,0,.42), rgba(0,0,0,.64))",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />
    </div>
  );
}

