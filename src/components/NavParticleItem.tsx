"use client";
import React, { useRef, useEffect } from "react";

interface NavParticleItemProps {
  text: string;
  onClick?: () => void;
  startDelay?: number;
  style?: React.CSSProperties;
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

const FONT_FAMILY = "'ChinaCyr',serif";
const MAX_PARTICLES = 500;
const LOGO_TEXT = "TASHI-ANI";

export default function NavParticleItem({
  text,
  onClick,
  startDelay = 0,
  style,
}: NavParticleItemProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Store as non-null refs for use inside closures
    const cvs: HTMLCanvasElement = canvas;
    const context: CanvasRenderingContext2D = ctx;

    const dpr = window.devicePixelRatio || 1;
    let W = 0, H = 0;
    let pixels: Array<{ x: number; y: number }> = [];

    interface Particle {
      x: number; y: number; tx: number; ty: number;
      ox: number; oy: number;
      size: number; bright: number; delay: number; gm: number;
      dispX: number; dispY: number; ox2: number; oy2: number;
    }

    let parts: Particle[] = [];
    let phase = 0; // 0=gather, 1=hold(idle), 2=disperse(hover out), 3=reform(hover in)
    let timer = 0;
    // Use a mutable object so cleanup always cancels the latest frame
    const raf = { id: null as number | null };
    let mounted = true;

    const GATHER = 120, DISPERSE = 160, REFORM = 120;

    function resize() {
      const off = document.createElement("canvas");
      off.width = 400; off.height = 72;
      const oc = off.getContext("2d")!;
      const fs = 72 * 0.28;
      oc.font = `normal ${fs}px ${FONT_FAMILY}`;
      const tw = oc.measureText(text).width;
      const pad = 28;
      W = Math.ceil(tw) + pad * 2;
      H = 72;
      cvs.width = W * dpr;
      cvs.height = H * dpr;
      cvs.style.width = W + "px";
      cvs.style.height = H + "px";
      context.scale(dpr, dpr);
      sampleText(fs, pad);
    }

    function sampleText(fs: number, pad: number) {
      const off = document.createElement("canvas");
      off.width = W; off.height = H;
      const oc = off.getContext("2d")!;
      oc.font = `normal ${fs}px ${FONT_FAMILY}`;
      oc.fillStyle = "#fff";
      oc.textAlign = "left";
      oc.textBaseline = "middle";
      oc.fillText(text, pad, H / 2);
      const data = oc.getImageData(0, 0, W, H).data;
      pixels = [];
      const step = 3;
      for (let y = 0; y < H; y += step)
        for (let x = 0; x < W; x += step)
          if (data[(y * W + x) * 4 + 3] > 128) pixels.push({ x, y });
    }

    function spawn() {
      return Math.random() < 0.5
        ? { x: Math.random() * W, y: -10 }
        : { x: -10, y: Math.random() * H };
    }

    function edge() {
      return Math.random() < 0.5
        ? { x: Math.random() * W, y: H + 10 }
        : { x: W + 10, y: Math.random() * H };
    }

    function init() {
      const n = Math.min(pixels.length, MAX_PARTICLES);
      parts = [];
      for (let i = 0; i < n; i++) {
        const tg = pixels[Math.floor(Math.random() * pixels.length)];
        const sp = spawn();
        parts.push({
          x: sp.x, y: sp.y, tx: tg.x, ty: tg.y,
          ox: sp.x, oy: sp.y,
          size: Math.random() * 1.0 + 0.4,
          bright: Math.random() * 0.5 + 0.55,
          delay: Math.random() * 50,
          gm: Math.random(),
          dispX: 0, dispY: 0, ox2: 0, oy2: 0,
        });
      }
    }

    function drawSolidText(alpha: number) {
      if (alpha <= 0.01) return;
      const fs = H * 0.28;
      context.save();
      context.font = `normal ${fs}px ${FONT_FAMILY}`;
      context.textAlign = "left";
      context.textBaseline = "middle";
      const g = context.createLinearGradient(0, H / 2 - fs * 0.5, 0, H / 2 + fs * 0.5);
      g.addColorStop(0, `rgba(230,200,140,${alpha})`);
      g.addColorStop(0.5, `rgba(201,169,110,${alpha})`);
      g.addColorStop(1, `rgba(180,140,80,${alpha})`);
      context.shadowColor = `rgba(201,169,110,${0.45 * alpha})`;
      context.shadowBlur = 12;
      context.fillStyle = g;
      context.fillText(text, 14, H / 2);
      context.restore();
    }

    function tick() {
      if (!mounted) return;
      timer++;
      context.clearRect(0, 0, W, H);

      if (phase === 0 && timer >= GATHER) { phase = 1; timer = 0; }
      else if (phase === 2 && timer >= DISPERSE) {
        phase = 3; timer = 0;
        for (const p of parts) {
          const sp = spawn();
          p.ox = sp.x; p.oy = sp.y;
          p.x = sp.x; p.y = sp.y;
        }
      } else if (phase === 3 && timer >= REFORM) { phase = 1; timer = 0; }

      if (phase === 1) {
        drawSolidText(1);
        raf.id = null;
        return;
      }

      for (const p of parts) {
        let px = 0, py = 0, alpha = 1;

        if (phase === 0) {
          const t = Math.min(1, Math.max(0, (timer - p.delay) / (GATHER - p.delay)));
          px = lerp(p.ox, p.tx, easeInOutCubic(t));
          py = lerp(p.oy, p.ty, easeInOutCubic(t));
          p.x = px; p.y = py; alpha = t;
        } else if (phase === 2) {
          const t = Math.min(1, timer / DISPERSE);
          px = lerp(p.ox2, p.dispX, easeInOutCubic(t));
          py = lerp(p.oy2, p.dispY, easeInOutCubic(t));
          p.x = px; p.y = py;
          alpha = Math.max(0, 1 - t / 0.65);
          const solidAlpha = Math.max(0, 1 - timer / 60);
          drawSolidText(solidAlpha);
        } else if (phase === 3) {
          const t = Math.min(1, Math.max(0, (timer - p.delay) / (REFORM - p.delay)));
          px = lerp(p.ox, p.tx, easeInOutCubic(t));
          py = lerp(p.oy, p.ty, easeInOutCubic(t));
          p.x = px; p.y = py; alpha = t;
        }

        if (alpha <= 0.01) continue;

        const r = Math.round(lerp(lerp(58, 122, p.gm), 201, 0));
        const g = Math.round(lerp(lerp(82, 158, p.gm), 169, 0));
        const b = Math.round(lerp(lerp(54, 114, p.gm), 110, 0));
        const br = p.bright * alpha;
        const gr = context.createRadialGradient(px, py, 0, px, py, p.size * 3);
        gr.addColorStop(0, `rgba(${r},${g},${b},${br})`);
        gr.addColorStop(0.4, `rgba(${r},${g},${b},${br * 0.3})`);
        gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
        context.beginPath(); context.arc(px, py, p.size * 3, 0, Math.PI * 2);
        context.fillStyle = gr; context.fill();
        context.beginPath(); context.arc(px, py, p.size * 0.6, 0, Math.PI * 2);
        context.fillStyle = `rgba(${Math.min(255, r + 60)},${Math.min(255, g + 50)},${Math.min(255, b + 30)},${br})`;
        context.fill();
      }

      if (phase === 0) {
        const solidT = Math.max(0, (timer - GATHER * 0.75) / (GATHER * 0.25));
        drawSolidText(Math.min(1, solidT));
      }
      if (phase === 3) {
        const solidT = Math.max(0, (timer - REFORM * 0.75) / (REFORM * 0.25));
        drawSolidText(Math.min(1, solidT));
      }

      raf.id = requestAnimationFrame(tick);
    }

    function hover() {
      if (phase === 2 || phase === 3) return;
      if (phase === 1) {
        for (const p of parts) {
          p.ox2 = p.tx; p.oy2 = p.ty;
          p.x = p.tx; p.y = p.ty;
          const ep = edge();
          p.dispX = ep.x; p.dispY = ep.y;
        }
        phase = 2; timer = 0;
        if (!raf.id) raf.id = requestAnimationFrame(tick);
      }
    }

    const handleMouseEnter = () => hover();
    const container = containerRef.current;
    let startTimerId: ReturnType<typeof setTimeout> | null = null;

    document.fonts.ready.then(() => {
      if (!mounted) return;
      resize();
      startTimerId = setTimeout(() => {
        startTimerId = null;
        if (!mounted) return;
        phase = 0; timer = 0;
        init();
        raf.id = requestAnimationFrame(tick);
      }, startDelay);
    });

    if (container) container.addEventListener("mouseenter", handleMouseEnter);

    return () => {
      mounted = false;
      if (raf.id) { cancelAnimationFrame(raf.id); raf.id = null; }
      if (startTimerId !== null) { clearTimeout(startTimerId); startTimerId = null; }
      if (container) container.removeEventListener("mouseenter", handleMouseEnter);
    };
  }, [text, startDelay]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        cursor: "none",
        display: "inline-block",
        ...style,
      }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      <canvas ref={canvasRef} style={{ display: "block" }} />
    </div>
  );
}

// ─── LOGO PARTICLE CANVAS ────────────────────────────────────────────────────
// Ported from topnav-menu.html LogoParticles + FontFace loader (document.fonts.ready)

interface LogoParticle {
  x: number; y: number;
  size: number; bright: number;
  // regular particle fields
  tx?: number; ty?: number; ox?: number; oy?: number;
  delay?: number; gm?: number;
  dispX?: number; dispY?: number; ox2?: number; oy2?: number;
  // ambient particle fields
  vx?: number; vy?: number;
  ambient?: boolean;
}

export function LogoParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cvs: HTMLCanvasElement = canvas;
    const context: CanvasRenderingContext2D = ctx;

    const dpr = window.devicePixelRatio || 1;
    let W = 0, H = 0;
    let pixels: Array<{ x: number; y: number }> = [];
    let parts: LogoParticle[] = [];
    let frame = 0, phase = 0, timer = 0;
    const raf = { id: null as number | null };
    let mounted = true;

    const FORM = 280, HOLD = 300, DISP = 320;

    function resize() {
      const z = cvs.parentElement;
      if (!z) return;
      W = z.clientWidth; H = z.clientHeight;
      cvs.width = W * dpr; cvs.height = H * dpr;
      cvs.style.width = W + "px"; cvs.style.height = H + "px";
      context.scale(dpr, dpr);
      sample(); init();
    }

    function sample() {
      const off = document.createElement("canvas");
      off.width = W; off.height = H;
      const oc = off.getContext("2d")!;
      let fs = Math.min(W / 5.5, H / 1.4);
      oc.font = `normal ${fs}px ${FONT_FAMILY}`;
      const pad = W * 0.16, mxW = W - pad * 2;
      const mw = oc.measureText(LOGO_TEXT).width;
      if (mw > mxW) fs *= mxW / mw;
      oc.font = `normal ${fs}px ${FONT_FAMILY}`;
      oc.fillStyle = "#fff"; oc.textAlign = "center"; oc.textBaseline = "middle";
      oc.fillText(LOGO_TEXT, W / 2, H / 2);
      const data = oc.getImageData(0, 0, W, H).data;
      pixels = [];
      const step = Math.max(2, Math.floor(W / 150));
      for (let y = 0; y < H; y += step)
        for (let x = 0; x < W; x += step)
          if (data[(y * W + x) * 4 + 3] > 128) pixels.push({ x, y });
    }

    function spawnPt() {
      return Math.random() < 0.5 ? { x: Math.random() * W, y: -12 } : { x: -12, y: Math.random() * H };
    }
    function edgePt() {
      return Math.random() < 0.5 ? { x: Math.random() * W, y: H + 12 } : { x: W + 12, y: Math.random() * H };
    }

    function init() {
      const n = Math.min(pixels.length, 1800); parts = [];
      for (let i = 0; i < n; i++) {
        const tg = pixels[Math.floor(Math.random() * pixels.length)];
        const sp = spawnPt();
        parts.push({ x: sp.x, y: sp.y, tx: tg.x, ty: tg.y, ox: sp.x, oy: sp.y,
          size: Math.random() * 1.3 + 0.5, bright: Math.random() * 0.5 + 0.55,
          delay: Math.random() * 80, gm: Math.random(), dispX: 0, dispY: 0, ox2: 0, oy2: 0 });
      }
      for (let i = 0; i < 80; i++) {
        const a = Math.random() * Math.PI * 2, spd = Math.random() * 0.08 + 0.02;
        parts.push({ x: Math.random() * W, y: Math.random() * H,
          vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
          size: Math.random() * 0.8 + 0.2, bright: Math.random() * 0.18 + 0.04, ambient: true });
      }
    }

    function draw() {
      if (!mounted) return;
      frame++; timer++;
      if (phase === 0 && timer >= FORM) { phase = 1; timer = 0; }
      else if (phase === 1 && timer >= HOLD) {
        phase = 2; timer = 0;
        for (const p of parts) if (!p.ambient) {
          const e = edgePt(); p.dispX = e.x; p.dispY = e.y; p.ox2 = p.x; p.oy2 = p.y;
        }
      } else if (phase === 2 && timer >= DISP) {
        phase = 0; timer = 0;
        for (const p of parts) if (!p.ambient) {
          const s = spawnPt(), t = pixels[Math.floor(Math.random() * pixels.length)];
          p.x = s.x; p.y = s.y; p.ox = s.x; p.oy = s.y; p.tx = t.x; p.ty = t.y; p.delay = Math.random() * 80;
        }
      }

      context.fillStyle = "#060b06"; context.fillRect(0, 0, W, H);

      for (const p of parts) {
        if (p.ambient) {
          p.x += p.vx!; p.y += p.vy!;
          if (p.x < -5) p.x = W + 5; if (p.x > W + 5) p.x = -5;
          if (p.y < -5) p.y = H + 5; if (p.y > H + 5) p.y = -5;
          const al = p.bright * (0.5 + 0.5 * Math.sin(frame * 0.025 + p.x));
          context.beginPath(); context.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          context.fillStyle = `rgba(58,82,54,${al})`; context.fill(); continue;
        }
        let px = 0, py = 0, cp = 0, al = 1;
        if (phase === 0) {
          const t = Math.min(1, Math.max(0, (timer - p.delay!) / (FORM - p.delay!)));
          px = lerp(p.ox!, p.tx!, easeInOutCubic(t)); py = lerp(p.oy!, p.ty!, easeInOutCubic(t));
          p.x = px; p.y = py; al = t;
        } else if (phase === 1) {
          px = p.tx! + Math.sin(frame * 0.015 + p.tx! * 0.01) * 0.5;
          py = p.ty! + Math.cos(frame * 0.015 + p.ty! * 0.01) * 0.5;
          p.x = px; p.y = py; cp = Math.min(1, timer / 50); al = Math.max(0, 1 - timer / 50);
        } else {
          const t = Math.min(1, timer / DISP);
          px = lerp(p.ox2!, p.dispX!, easeInOutCubic(t)); py = lerp(p.oy2!, p.dispY!, easeInOutCubic(t));
          p.x = px; p.y = py; al = Math.max(0, 1 - t / 0.65);
        }
        if (al <= 0.01) continue;
        const r = Math.round(lerp(lerp(58, 122, p.gm!), 201, cp));
        const g = Math.round(lerp(lerp(82, 158, p.gm!), 169, cp));
        const b = Math.round(lerp(lerp(54, 114, p.gm!), 110, cp));
        const br = p.bright * al;
        const gr = context.createRadialGradient(px, py, 0, px, py, p.size * 3);
        gr.addColorStop(0, `rgba(${r},${g},${b},${br})`);
        gr.addColorStop(0.4, `rgba(${r},${g},${b},${br * 0.3})`);
        gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
        context.beginPath(); context.arc(px, py, p.size * 3, 0, Math.PI * 2);
        context.fillStyle = gr; context.fill();
        context.beginPath(); context.arc(px, py, p.size * 0.6, 0, Math.PI * 2);
        context.fillStyle = `rgba(${Math.min(255, r + 60)},${Math.min(255, g + 50)},${Math.min(255, b + 30)},${br})`;
        context.fill();
      }

      if (phase === 1 || phase === 2) {
        const fi = phase === 1 ? Math.min(1, timer / 80) : 1;
        const fo = phase === 2 ? Math.max(0, 1 - timer / 90) : 1;
        const a = fi * fo;
        if (a > 0.01) {
          let fs = Math.min(W / 5.5, H / 1.4);
          context.font = `normal ${fs}px ${FONT_FAMILY}`;
          const pad = W * 0.16, mxW = W - pad * 2;
          const mw = context.measureText(LOGO_TEXT).width;
          if (mw > mxW) fs *= mxW / mw;
          context.save(); context.font = `normal ${fs}px ${FONT_FAMILY}`;
          context.textAlign = "center"; context.textBaseline = "middle";
          const gd = context.createLinearGradient(0, H / 2 - fs * 0.5, 0, H / 2 + fs * 0.5);
          gd.addColorStop(0, `rgba(230,200,140,${a})`);
          gd.addColorStop(0.5, `rgba(201,169,110,${a})`);
          gd.addColorStop(1, `rgba(180,140,80,${a})`);
          context.shadowColor = `rgba(201,169,110,${0.55 * a})`; context.shadowBlur = 18;
          context.fillStyle = gd; context.fillText(LOGO_TEXT, W / 2, H / 2); context.restore();
        }
      }

      raf.id = requestAnimationFrame(draw);
    }

    const handleResize = () => { resize(); };

    // FontFace loader: wait for ChinaCyr font (loaded via CSS @font-face) before drawing
    document.fonts.ready.then(() => {
      if (!mounted) return;
      // Initialize: logo.resize(); logo.draw();
      resize();
      raf.id = requestAnimationFrame(draw);
      window.addEventListener("resize", handleResize);
    });

    return () => {
      mounted = false;
      if (raf.id) { cancelAnimationFrame(raf.id); raf.id = null; }
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div
      style={{
        position: "relative",
        width: 320,
        height: 72,
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      <canvas
        ref={canvasRef}
        id="logoCanvas"
        style={{ position: "absolute", top: 0, left: 0 }}
      />
    </div>
  );
}
