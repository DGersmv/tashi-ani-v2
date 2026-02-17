// src/components/MapLoader.tsx
import { useEffect, useState } from "react";

export default function MapLoader() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame: number;
    function tick() {
      setProgress((p) => {
        if (p < 95) return p + 1 + Math.random() * 2;
        return p;
      });
      frame = requestAnimationFrame(tick);
    }
    tick();
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-transparent z-50">
      <div className="w-32 h-32 border-8 border-cyan-300 border-t-transparent rounded-full animate-spin mb-6 opacity-60" />
      <div style={{
        width: 180,
        height: 9,
        borderRadius: 7,
        overflow: "hidden",
        background: "rgba(36,250,255,0.15)",
        marginBottom: 18,
        marginTop: -24
      }}>
        <div
          style={{
            width: `${progress}%`,
            height: "100%",
            background: "linear-gradient(90deg,#29f2ff,#2dfcc1 78%)",
            borderRadius: 7,
            boxShadow: "0 2px 8px #00fff922"
          }}
        />
      </div>
      <div className="text-lg text-cyan-200 font-bold drop-shadow-lg">
        Загрузка 3D-карты...
      </div>
    </div>
  );
}

