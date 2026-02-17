"use client";
import { useEffect, useRef } from "react";

export default function AnimatedGlassBorder({
  panelRef,
  onComplete,
  duration = 0.3,
}: {
  panelRef: React.RefObject<HTMLDivElement>;
  onComplete?: () => void;
  duration?: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    // любой ваш текущий код анимации
    const t = setTimeout(() => onComplete && onComplete(), duration * 1000);
    return () => clearTimeout(t);
  }, [onComplete, duration]);

  return (
    <svg
      ref={svgRef}
      className="pointer-events-none"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 3,          // выше карты
        borderRadius: "inherit",
      }}
      width="100%"
      height="100%"
    >
      <defs>
        <linearGradient id="glassBorder" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#3ffdfd" />
          <stop offset="1" stopColor="#2afec3" />
        </linearGradient>
      </defs>
      <path
        d="
          M42,0 H calc(100% - 42)
          Q 100%,0 100%,42
          V calc(100% - 42)
          Q 100%,100% calc(100% - 42),100%
          H42
          Q0,100% 0,calc(100% - 42)
          V42
          Q0,0 42,0
        "
        fill="none"
        stroke="url(#glassBorder)"
        strokeWidth="3"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
