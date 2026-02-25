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
  const [isHovered, setIsHovered] = React.useState(false);

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
    let phase = 0; // 0=gather, 1=hold(idle), 2=disperse(on click), 3=reform
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

    function triggerDisperse() {
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

    const handleClick = () => triggerDisperse();
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

    if (container) container.addEventListener("click", handleClick);

    return () => {
      mounted = false;
      if (raf.id) { cancelAnimationFrame(raf.id); raf.id = null; }
      if (startTimerId !== null) { clearTimeout(startTimerId); startTimerId = null; }
      if (container) container.removeEventListener("click", handleClick);
    };
  }, [text, startDelay]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        cursor: "none",
        display: "inline-block",
        transform: isHovered ? "translateY(-2px)" : "translateY(0)",
        transition: "transform 0.18s ease",
        ...style,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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

      context.clearRect(0, 0, W, H);

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
          gd.addColorStop(0, `rgba(255,255,255,${a})`);
          gd.addColorStop(0.5, `rgba(255,255,255,${a})`);
          gd.addColorStop(1, `rgba(255,255,255,${a})`);
          context.shadowColor = `rgba(255,255,255,${0.55 * a})`; context.shadowBlur = 18;
          context.fillStyle = gd; context.fillText(LOGO_TEXT, W / 2, H / 2); context.restore();
        }
      }

      raf.id = requestAnimationFrame(draw);
    }

    const handleResize = () => { resize(); };

    // FontFace loader: load ChinaCyr from embedded base64 (not available as a CSS @font-face in this React app)
    const chinaFont = new FontFace('ChinaCyr','url(data:font/truetype;base64,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AHIATv/ZAHIAT//bAHIAUP/ZAHIAUf/ZAHIAUv+yAHIAU//ZAHIAVP+yAHIAVf/ZAHIAVv+hAHIAV//HAHIAWP/dAHIAWf/ZAHIAWv/rAHIAW/+9AHIAXP/tAHIAXf/OAHIAX/+zAHIAYf+mAHIAY/+wAHIAZf/vAHIAZv/WAHIAZ/+RAHIAaP/vAHIAav/pAHIAbP/SAHIAb/+oAHIAc//qAHIAff/qAHIAgP/qAHIAg//UAHIAj/+oAHIAk//qAHIAnf/qAHIAoP/qAHIAo//UAHIAuP/HAHIAuf9dAHMAQv4dAHMAQ//xAHMAX//DAHMAY//AAHMAZ//1AHMAgf/qAHMAjAALAHMAof/qAHMArAALAHMAuP/iAHMAuf/iAHMAv/+6AHQAIf/CAHQAQv4qAHQAV//BAHQAX/+JAHQAY/+GAHQAuP+bAHQAuf/pAHQAv//sAHUAH//rAHUAQv4EAHUAX/+tAHUAYf/bAHUAY/+qAHUAZv/2AHUAZ/+vAHUAev/fAHUAff/fAHUAgP/qAHUAg//fAHUAmv/fAHUAnf/fAHUAoP/qAHUAo//fAHUAuf+lAHYAQv36AHYAQ//zAHYAX/+oAHYAY/+lAHYAuP/1AHYAuf/fAHYAv//SAHcAQv3fAHcAX/+WAHcAY/+SAHcAuf/hAHcAv//nAHgAQv3fAHgAX/+SAHgAY/+PAHgAuf/hAHgAv//nAHkAH//gAHkAIP/xAHkAQv4SAHkAX/+tAHkAYf++AHkAY/+qAHkAZv/lAHkAZ/+TAHkAff/qAHkAgP/qAHkAg//qAHkAnf/qAHkAoP/qAHkAo//qAHkAuP/wAHkAuf+TAHoAQv3kAHoAX/+WAHoAY/+TAHoAb//1AHoAgf/1AHoAj//1AHoAof/1AHoAuf/nAHoAv//cAHsAQv3gAHsAX/+YAHsAY/+VAHsAuf/hAHsAv//nAHwAQv5cAHwAX//ZAHwAY//WAHwAuP/yAH0AQv34AH0AQ//MAH0AX/+gAH0AY/+bAH0Ab//fAH0Adf/fAH0Agf/iAH0AhP/fAH0Aj//fAH0Alf/fAH0Aof/iAH0ApP/fAH0Av/+xAH4AQv31AH4AX/+VAH4AY/+SAH4Auf/hAH4Av//ZAH8AEf9xAH8ALf/rAH8AQv5UAH8AQ//yAH8ARP/wAH8ATf/rAH8AX/+aAH8AYP/2AH8AY/+XAH8Ab//TAH8Adf/1AH8AhP/QAH8Aj//TAH8Alf/1AH8ApP/QAH8Auf/qAH8Av//HAIAAIP/WAIAAIf/2AIAAQv3tAIAAX/+MAIAAYf8bAIAAY/+JAIAAZv/CAIAAZ/6/AIAAb//1AIAAj//1AIAAuP/jAIAAuf/DAIAAv//dAIEAEf/LAIEAHf/DAIEAHv/DAIEAH//QAIEAIP+6AIEAJP/VAIEALf/UAIEAQv4LAIEARP/UAIEARv/GAIEASP/HAIEASf+4AIEASv/HAIEATf/UAIEAUv/HAIEAVP/HAIEAX/+mAIEAYf+2AIEAY/+jAIEAZf/2AIEAZv/mAIEAZ/+hAIEAaP/2AIEAav/VAIEAbP/gAIEAb/+fAIEAc//qAIEAev/JAIEAff/iAIEAgP/qAIEAg//fAIEAjv/qAIEAj/+fAIEAk//qAIEAmv/JAIEAnf/iAIEAoP/qAIEAo//fAIEArv/qAIEAuP+UAIEAuf9sAIIAQv5CAIIAX/+bAIIAY/+YAIIAb//xAIIAj//xAIIAuf/nAIIAv//tAIMAEf+YAIMAIv/ZAIMALf/vAIMAPf/gAIMAQv3+AIMAQ/+YAIMATf/vAIMAX/+fAIMAY/+aAIMAb//UAIMAdf/fAIMAdv/qAIMAev/qAIMAgf/fAIMAhP/JAIMAjP/1AIMAj//UAIMAlf/fAIMAlv/qAIMAmv/qAIMAof/fAIMApP/JAIMArP/1AIMAv/+xAIQAQv4MAIQAX/+zAIQAYf/NAIQAY/+wAIQAZ//mAIQAev/cAIQAff/fAIQAgP/kAIQAg//JAIQAhv/1AIQAjv/qAIQAmv/cAIQAnf/fAIQAoP/kAIQAo//JAIQApv/1AIQArv/qAIQAuP/tAIQAuf+yAIQAv//WAIUAX//jAIUAY//gAIUAuP/zAIUAuf/yAIUAv//sAIYAQv47AIYAX/+XAIYAY/+UAIYAuf/hAIYAv//nAIcAQv3jAIcAX/+ZAIcAY/+WAIcAuf/nAIcAv//tAIgAX//hAIgAY//eAIgAuP/zAIgAuf/wAIgAv//qAIkAIv/0AIkAN//fAIkAPP/2AIkAQf+ZAIkAQv4AAIkAQ/9tAIkAV//fAIkAX/+aAIkAYP/2AIkAY/+XAIkAaf+cAIkAa//pAIkAuP/QAIkAuf/qAIkAv/+YAIoAQv3eAIoAX/+WAIoAY/+TAIoAuf/hAIoAv//nAIsAIv/0AIsAN//fAIsAPP/2AIsAQf+aAIsAQv5WAIsAQ/9uAIsAV//fAIsAX/+bAIsAYP/2AIsAY/+XAIsAaf+dAIsAa//pAIsAuP/QAIsAuf/qAIsAv/+YAIwAQv35AIwAQ//OAIwAX/+hAIwAY/+cAIwAb//qAIwAdf/qAIwAev/qAIwAhP/qAIwAj//qAIwAlf/qAIwAmv/qAIwApP/qAIwAv/+yAI0AQv36AI0AQ//OAI0AX/+iAI0AY/+cAI0Ab//qAI0Adf/qAI0AhP/qAI0Aj//qAI0Alf/qAI0ApP/qAI0Av/+zAI4AQv4SAI4AX/+TAI4AY/+QAI4Auf/hAI4Av//nAI8AQf6aAI8AQv3fAI8AQ/7QAI8AX/+XAI8AY/+UAI8Auf/rAI8Av/+ZAJAAQf6zAJAAQv5ZAJAAQ/7pAJAAX/+lAJAAY/+iAJAAuP/bAJAAuf/aAJAAv//kAJEAIv/eAJEAN//TAJEAQf6wAJEAQv5WAJEAQ//oAJEAX/+nAJEAY/+kAJEAdf/1AJEAlf/1AJEAuf/oAJEAv/+8AJIAEf+7AJIAHf+0AJIAHv+1AJIAH/++AJIAIP+xAJIAJP/rAJIALf/oAJIAPf/PAJIAQf7kAJIAQv6dAJIAQ/8FAJIARP/rAJIAX/+zAJIAYf+mAJIAY/+wAJIAZv/WAJIAZ/+RAJIAav/pAJIAbP/SAJIAb/+oAJIAc//qAJIAff/qAJIAgP/qAJIAg//UAJIAj/+oAJIAk//qAJIAnf/qAJIAoP/qAJIAo//UAJIAuP/HAJIAuf9dAJIAv/+3AJMAN//0AJMAQf/1AJMAQv4dAJMAQ//xAJMAX//DAJMAY//AAJMAgf/qAJMAjAALAJMAof/qAJMArAALAJMAuP/xAJMAuf/iAJMAv/+6AJQAQv4qAJQAX/+JAJQAY/+GAJQAav/yAJQAuP+bAJQAuf/pAJQAv//sAJUAQf67AJUAQv4EAJUAQ/7xAJUAX/+tAJUAYf/bAJUAY/+qAJUAZ/+vAJUAev/fAJUAff/fAJUAgP/qAJUAg//fAJUAmv/fAJUAnf/fAJUAoP/qAJUAo//fAJUAuf+lAJUAv/+wAJYAIv/kAJYAQv36AJYAQ/+JAJYAX/+oAJYAY/+lAJYAuf/dAJYAv//SAJcAQf6aAJcAQv3fAJcAQ/7QAJcAX/+WAJcAY/+SAJcAuf/rAJcAv/+ZAJgAQf/wAJgAQv3fAJgAQ//rAJgAX/+SAJgAY/+PAJgAuf/rAJgAv/+kAJkAH//xAJkAQf67AJkAQv4SAJkAQ/7xAJkAX/+tAJkAYf++AJkAY/+qAJkAZ/+TAJkAff/qAJkAgP/qAJkAg//qAJkAnf/qAJkAoP/qAJkAo//qAJkAuf+TAJkAv/+xAJoAIv/mAJoAQv3kAJoAQ/+IAJoAX/+WAJoAY/+TAJoAb//1AJoAgf/1AJoAj//1AJoAof/1AJoAuf/vAJoAv//cAJsAQf6aAJsAQv3gAJsAQ/7QAJsAX/+YAJsAY/+VAJsAuf/rAJsAv/+ZAJwAQf8EAJwAQv5cAJwAQ/86AJwAX//TAJwAY//QAJwAv//sAJ0AIv/VAJ0AN//IAJ0AQf+qAJ0AQv34AJ0AQ//MAJ0AX/+gAJ0AY/+bAJ0Aaf/3AJ0Ab//fAJ0Adf/fAJ0Agf/iAJ0AhP/fAJ0Aj//fAJ0Alf/fAJ0Aof/iAJ0ApP/fAJ0AuP/wAJ0Av/+xAJ4AIv/kAJ4AQv31AJ4AQ/+HAJ4AX/+VAJ4AY/+SAJ4Auf/qAJ4Av//ZAJ8AEf9xAJ8AIv+vAJ8ALf/rAJ8AN//QAJ8APf/QAJ8AQf6xAJ8AQv5UAJ8AQ//yAJ8ATf/rAJ8AX/+aAJ8AY/+XAJ8Ab//TAJ8Adf/1AJ8AhP/QAJ8Aj//TAJ8Alf/1AJ8ApP/QAJ8Av//HAKAAIv/OAKAAQv3tAKAAQ/+GAKAAX/+MAKAAYf8bAKAAY/+JAKAAZ/7HAKAAb//1AKAAj//1AKAAuP/0AKAAuf/DAKAAv//dAKEAEf/LAKEAHf/DAKEAHv/DAKEAH//QAKEAIP+6AKEALf/3AKEAPf/zAKEAQv4LAKEAQ/+qAKEAX/+mAKEAYf+2AKEAY/+jAKEAZv/mAKEAZ/+hAKEAav/VAKEAbP/gAKEAb/+fAKEAc//qAKEAev/JAKEAff/iAKEAgP/qAKEAg//fAKEAjv/qAKEAj/+fAKEAk//qAKEAmv/JAKEAnf/iAKEAoP/qAKEAo//fAKEArv/qAKEAuf9sAKEAv/+sAKIAQf6fAKIAQv5CAKIAQ/7VAKIAX/+bAKIAY/+YAKIAb//xAKIAj//xAKIAuf/wAKIAv/+eAKMAEf+YAKMAIv/KAKMALf/vAKMAN//CAKMAPf/zAKMAQf61AKMAQv3+AKMAQ/+YAKMATf/vAKMAX/+fAKMAY/+aAKMAaf+wAKMAb//UAKMAdf/fAKMAdv/qAKMAev/qAKMAgf/fAKMAhP/JAKMAjP/1AKMAj//UAKMAlf/fAKMAlv/qAKMAmv/qAKMAof/fAKMApP/JAKMArP/1AKMAuP/cAKMAv/+xAKQAQf7AAKQAQv4MAKQAQ/72AKQAX/+zAKQAYf/NAKQAY/+wAKQAZ//YAKQAev/cAKQAff/fAKQAgP/kAKQAg//JAKQAhv/1AKQAjv/qAKQAmv/cAKQAnf/fAKQAoP/kAKQAo//JAKQApv/1AKQArv/qAKQAuP/tAKQAuf+yAKQAv//WAKUAQf7oAKUAQ/8eAKUAX//jAKUAY//gAKUAuf/yAKUAv//sAKYAQf6aAKYAQv47AKYAQ/7QAKYAX/+XAKYAY/+UAKYAuf/rAKYAv/+ZAKcAQf6fAKcAQv3jAKcAQ/7VAKcAX/+ZAKcAY/+WAKcAuf/wAKcAv/+eAKgAQf7oAKgAQ/8eAKgAX//hAKgAY//eAKgAuf/wAKgAv//qAKkAIv/0AKkAN//fAKkAPP/XAKkAQf+ZAKkAQv4AAKkAQ/9tAKkAV//fAKkAX/+aAKkAY/+XAKkAaf+cAKkAa/+4AKkAuP/QAKkAuf/WAKkAv/+YAKoAQf6aAKoAQv3eAKoAQ/7QAKoAX/+WAKoAY/+TAKoAuf/rAKoAv/+ZAKsAIv/0AKsAN//fAKsAPP/WAKsAQf+aAKsAQv5WAKsAQ/9uAKsAV//fAKsAX/+bAKsAY/+XAKsAaf+dAKsAa/+4AKsAuP/QAKsAuf/VAKsAv/+YAKwAIv/VAKwAN//JAKwAQf+sAKwAQv35AKwAQ//OAKwAX/+hAKwAY/+cAKwAb//qAKwAdf/qAKwAev/qAKwAhP/qAKwAj//qAKwAlf/qAKwAmv/qAKwApP/qAKwAuP/xAKwAv/+yAK0AIv/YAK0AN//LAK0AQf+tAK0AQv36AK0AQ//OAK0AX/+iAK0AY/+cAK0Ab//qAK0Adf/qAK0AhP/qAK0Aj//qAK0Alf/qAK0ApP/qAK0AuP/zAK0Av/+zAK4AQf6bAK4AQv4SAK4AQ/7RAK4AX/+TAK4AY/+QAK4Auf/sAK4Av/+aAK8AQv4pAK8AX/+NAK8AY/+KAK8Aav/yAK8AuP+cAK8Auf/qAK8Av//tAAAAAAAWAQ4AAAAAAAAAAAASADAAAAAAAAAAAQAQAEIAAAAAAAAAAgAOAAAAAAAAAAAAAwAQAEIAAAAAAAAABAAQAEIAAAAAAAAABQAKAA4AAAAAAAAABgAQAEIAAAAAAAAABwAAABgAAQAAAAAAAAAJABgAAQAAAAAAAQAIACEAAQAAAAAAAgAHACkAAQAAAAAAAwAIACEAAQAAAAAABAAIACEAAQAAAAAABgAIACEAAQAAAAAABwAAADAAAwABBAkAAAASADAAAwABBAkAAQAQAEIAAwABBAkAAgAOAAAAAwABBAkAAwAQAEIAAwABBAkABAAQAEIAAwABBAkABgAQAEIAAwABBAkABwAAAFIAUgBlAGcAdQBsAGEAcgAwADEALgAwADNhbGFyaXhnb3RDaGluYUN5clJlZ3VsYXIAYQBsAGEAcgBpAHgAZwBvAHQAQwBoAGkAbgBhAEMAeQByAAIAAAAAAAD/TAA/AAAAAAAAAAAAAAAAAAAAAAAAAAAAwwAAAAEAAgADAAQABQAGAAcACAAJAAoACwAMAA0ADgAPABAAEQASABMAFAAVABYAFwAYABkAGgAbABwAHQAeAB8AIAAhACIAIwAkACUAJgAnACgAKQAqACsALAAtAC4ALwAwADEAMgAzADQANQA2ADcAOAA5ADoAOwA8AD0APgA/AEAAQQBCAEMARABFAEYARwBIAEkASgBLAEwATQBOAE8AUABRAFIAUwBUAFUAVgBXAFgAWQBaAFsAXABdAF4AXwBgAGEAvQDoAIYAiwCpAKQAigCDAJMAiACqAJcBAgEDAQQBBQEGAQcBCAEJAQoBCwEMAQ0BDgEPARABEQESARMBFAEVARYBFwEYARkBGgEbARwBHQEeAR8BIAEhASIBIwEkASUBJgEnASgBKQEqASsBLAEtAS4BLwEwATEBMgEzATQBNQE2ATcBOAE5AToBOwE8AT0BPgE/AUABQQFCAUMAsgCzALYAtwDEALQAtQDFAIIAhwCrAMYAvgC/AUQAjADDAUUBRglhZmlpMTAwMjMJYWZpaTEwMDE3CWFmaWkxMDAxOAlhZmlpMTAwMTkJYWZpaTEwMDIwCWFmaWkxMDAyMQlhZmlpMTAwMjIJYWZpaTEwMDI0CWFmaWkxMDAyNQlhZmlpMTAwMjYJYWZpaTEwMDI3CWFmaWkxMDAyOAlhZmlpMTAwMjkJYWZpaTEwMDMwCWFmaWkxMDAzMQlhZmlpMTAwMzIJYWZpaTEwMDMzCWFmaWkxMDAzNAlhZmlpMTAwMzUJYWZpaTEwMDM2CWFmaWkxMDAzNwlhZmlpMTAwMzgJYWZpaTEwMDM5CWFmaWkxMDA0MAlhZmlpMTAwNDEJYWZpaTEwMDQyCWFmaWkxMDA0MwlhZmlpMTAwNDQJYWZpaTEwMDQ1CWFmaWkxMDA0NglhZmlpMTAwNDcJYWZpaTEwMDQ4CWFmaWkxMDA0OQlhZmlpMTAwNjUJYWZpaTEwMDY2CWFmaWkxMDA2NwlhZmlpMTAwNjgJYWZpaTEwMDY5CWFmaWkxMDA3MAlhZmlpMTAwNzIJYWZpaTEwMDczCWFmaWkxMDA3NAlhZmlpMTAwNzUJYWZpaTEwMDc2CWFmaWkxMDA3NwlhZmlpMTAwNzgJYWZpaTEwMDc5CWFmaWkxMDA4MAlhZmlpMTAwODEJYWZpaTEwMDgyCWFmaWkxMDA4MwlhZmlpMTAwODQJYWZpaTEwMDg1CWFmaWkxMDA4NglhZmlpMTAwODcJYWZpaTEwMDg4CWFmaWkxMDA4OQlhZmlpMTAwOTAJYWZpaTEwMDkxCWFmaWkxMDA5MglhZmlpMTAwOTMJYWZpaTEwMDk0CWFmaWkxMDA5NQlhZmlpMTAwOTYJYWZpaTEwMDk3CWFmaWkxMDA3MQlhZmlpNjEzNTIFdTAwMDAFdTAwMDkAAAABAACAAAAAAW4CRwAAYAAC0AJ1YV9Cb3NhTm92YUNwICAgIP////83///+QV9CUjAwAAAAAAAA)');
    chinaFont.load().then(loaded => {
      document.fonts.add(loaded);
      if (!mounted) return;
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
