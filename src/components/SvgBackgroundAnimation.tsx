"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

// crop to content bounds (no empty space) — union of 001/002/003 paths
const VIEW_BOX = "100 715 580 360";
const LAYER_OPACITY = 1;

const GOLD = "#C9A96E";
const MIN_PATH_LENGTH = 80;

// общий масштаб всех слоёв (0.75 = −25%)
const LAYERS_SCALE = 0.9;
// смещение вниз (+Y), вверх (-Y)
const LAYERS_OFFSET_Y = 8;

// 001: 0–3.5s, 002: 3.5–7s, 003: 7–10.5s → hold 2s → fade 2s → restart
const HOLD_MS = 2000;
const FADE_MS = 2000;
const DRAW_END_MS = 10500; // 003 finishes ~10.5s
const HOLD_START_MS = DRAW_END_MS;
const FADE_START_MS = HOLD_START_MS + HOLD_MS;
const CYCLE_DURATION_MS = FADE_START_MS + FADE_MS;

function extractPathsFromSvg(
  svgText: string,
  minLength = MIN_PATH_LENGTH
): { id: number; d: string }[] {
  if (typeof window === "undefined") return [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, "image/svg+xml");
  const pathEls = doc.querySelectorAll("path");
  const result: { id: number; d: string }[] = [];
  let id = 0;
  pathEls.forEach((el) => {
    const d = el.getAttribute("d");
    if (d && d.length > minLength) {
      result.push({ id: id++, d });
    }
  });
  return result;
}

const ANIM_DELAY_002 = 3.5;
const ANIM_DELAY_003 = 7; // 003 starts after 002

type Phase = "draw" | "fade";

function PathsLayer({
  paths,
  stroke,
  delay = 0,
  phase,
  cycle,
  strokeWidth = 2,
  targetOpacity = 0.85,
  strokeOpacityBase = 0.2,
  visible = true,
  scale = 1,
  translateYPercent = 0,
  translateXPercent = 0,
}: {
  paths: { id: number; d: string }[];
  stroke: string;
  delay?: number;
  phase: Phase;
  cycle: number;
  strokeWidth?: number;
  targetOpacity?: number;
  strokeOpacityBase?: number;
  visible?: boolean;
  scale?: number;
  translateYPercent?: number;
  translateXPercent?: number;
}) {
  if (paths.length === 0 || !visible) return null;
  const layerStyle = {
    position: "absolute" as const,
    inset: 0,
    opacity: LAYER_OPACITY,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  } as const;
  const isFade = phase === "fade";
  return (
    <div style={layerStyle}>
      <svg
        style={{
          width: "100%",
          height: "100%",
          transform: [
            scale !== 1 && `scale(${scale})`,
            (translateXPercent !== 0 || translateYPercent !== 0) &&
              `translate(${translateXPercent}%, ${translateYPercent}%)`,
          ]
            .filter(Boolean)
            .join(" ") || undefined,
          transformOrigin: "center center",
        }}
        viewBox={VIEW_BOX}
        fill="none"
        preserveAspectRatio="xMidYMid meet"
      >
        {paths.map((path) => {
          const strokeOpacity = strokeOpacityBase + (path.id % 20) * 0.03;
          return (
            <motion.path
              key={`${path.id}-${cycle}`}
              d={path.d}
              fill="none"
              pathLength={1}
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeOpacity={strokeOpacity}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={
                isFade
                  ? { pathLength: 1, opacity: 0 }
                  : { pathLength: 1, opacity: targetOpacity }
              }
              transition={
                isFade
                  ? { duration: FADE_MS / 1000, ease: "easeInOut" }
                  : {
                      duration: 2 + (path.id % 2),
                      delay,
                      repeat: 0,
                      ease: "easeOut",
                    }
              }
            />
          );
        })}
      </svg>
    </div>
  );
}

function PathsFrom001({
  phase,
  cycle,
}: {
  phase: Phase;
  cycle: number;
}) {
  const [paths, setPaths] = useState<{ id: number; d: string }[]>([]);
  useEffect(() => {
    fetch("/svg/001.svg")
      .then((r) => r.text())
      .then((text) => setPaths(extractPathsFromSvg(text)))
      .catch(() => setPaths([]));
  }, []);
  return (
    <PathsLayer
      paths={paths}
      stroke={GOLD}
      phase={phase}
      cycle={cycle}
      strokeWidth={1.5}
      targetOpacity={1}
      strokeOpacityBase={0.75}
      scale={LAYERS_SCALE}
      translateYPercent={LAYERS_OFFSET_Y}
    />
  );
}

function PathsFrom002({
  phase,
  cycle,
  visible = true,
}: {
  phase: Phase;
  cycle: number;
  visible?: boolean;
}) {
  const [paths, setPaths] = useState<{ id: number; d: string }[]>([]);
  useEffect(() => {
    fetch("/svg/002.svg")
      .then((r) => r.text())
      .then((text) => setPaths(extractPathsFromSvg(text)))
      .catch(() => setPaths([]));
  }, []);
  return (
    <PathsLayer
      paths={paths}
      stroke="white"
      delay={0}
      phase={phase}
      cycle={cycle}
      strokeWidth={1}
      targetOpacity={1}
      strokeOpacityBase={0.9}
      visible={visible}
      scale={LAYERS_SCALE}
      translateYPercent={LAYERS_OFFSET_Y}
    />
  );
}

function PathsFrom003({
  phase,
  cycle,
  visible = true,
}: {
  phase: Phase;
  cycle: number;
  visible?: boolean;
}) {
  const [paths, setPaths] = useState<{ id: number; d: string }[]>([]);
  useEffect(() => {
    fetch("/svg/003.svg")
      .then((r) => r.text())
      .then((text) => setPaths(extractPathsFromSvg(text, 40)))
      .catch(() => setPaths([]));
  }, []);
  return (
    <PathsLayer
      paths={paths}
      stroke="white"
      delay={0}
      phase={phase}
      cycle={cycle}
      strokeWidth={1}
      targetOpacity={1}
      strokeOpacityBase={0.9}
      visible={visible}
      scale={LAYERS_SCALE}
      translateYPercent={LAYERS_OFFSET_Y}
    />
  );
}

export default function SvgBackgroundAnimation() {
  const [phase, setPhase] = useState<Phase>("draw");
  const [cycle, setCycle] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("fade"), FADE_START_MS);
    const t2 = setTimeout(() => {
      setCycle((c) => c + 1);
      setPhase("draw");
      setElapsed(0);
    }, CYCLE_DURATION_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [cycle]);

  useEffect(() => {
    if (phase !== "draw") return;
    const start = Date.now();
    const id = setInterval(() => setElapsed(Math.min(Date.now() - start, CYCLE_DURATION_MS)), 50);
    return () => clearInterval(id);
  }, [phase, cycle]);

  const show002 = elapsed >= ANIM_DELAY_002 * 1000;
  const show003 = elapsed >= ANIM_DELAY_003 * 1000;

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        overflow: "hidden",
        pointerEvents: "none",
        padding: "28% 1.5% 4% 1.5%",
        boxSizing: "border-box",
      }}
    >
      <PathsFrom001 phase={phase} cycle={cycle} />
      <PathsFrom002 phase={phase} cycle={cycle} visible={show002} />
      <PathsFrom003 phase={phase} cycle={cycle} visible={show003} />
    </div>
  );
}
