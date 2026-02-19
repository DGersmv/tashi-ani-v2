import { useEffect, useState } from 'react';

/** Точки с API или CSV; img — dataURL или путь к маркеру */
export default function useTourPoints() {
  const [pts, setPts] = useState<
    { lon: number; lat: number; img: string }[]
  >([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/site/points', { cache: 'no-store' });
        const data = await res.json();
        if (cancelled || !Array.isArray(data.points)) {
          if (!cancelled) loadFromCsv(setPts);
          return;
        }
        const list = await Promise.all(
          data.points.map(async (p: { lon: number; lat: number; file?: string }) => {
            const src = p.file ? `/points/${p.file}` : '/points/default.png';
            return { lon: Number(p.lon), lat: Number(p.lat), img: await normalize(src) };
          })
        );
        if (!cancelled) setPts(list);
      } catch {
        if (!cancelled) loadFromCsv(setPts);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return pts;
}

async function loadFromCsv(setPts: (p: { lon: number; lat: number; img: string }[]) => void) {
  try {
    const raw = await fetch('/points/coords.csv').then((r) => r.text());
    const rows = raw.trim().split(/\r?\n/);
    const list = await Promise.all(
      rows.map(async (row) => {
        const [lonStr, latStr, file = ''] = row.split(/[,;]/).map((s) => s.trim());
        const src = file ? `/points/${file}` : '/points/default.png';
        return { lon: +lonStr, lat: +latStr, img: await normalize(src) };
      })
    );
    setPts(list);
  } catch {
    setPts([]);
  }
}

/* ----------------- helper ----------------- */
/* Сжимает/обрезает до ближайшей степени двойки ≤256px,
   возвращает dataURL PNG; если src не найдён → вернёт OG-маркер */
async function normalize(src: string): Promise<string> {
  try {
    const im = await load(src);
    const maxSide = Math.max(im.width, im.height);
    if (
      maxSide <= 256 &&
      (im.width & (im.width - 1)) === 0 &&
      (im.height & (im.height - 1)) === 0
    ) {
      return src;                       // уже годно
    }

    const canvas = document.createElement('canvas');
    const size = 256;                   // 256×256 — точно влезет
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(im, 0, 0, size, size);
    return canvas.toDataURL('image/png');
  } catch {
    return '/external/og/lib/res/marker.png'; // fallback на PNG 1024×1024 для четкости
  }
}

function load(url: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = url;
  });
}
