'use client';

import { useEffect, useRef, useState } from 'react';
import useTourPoints from '@/lib/useTourPoints';

// ====== НАСТРОЙКИ ОРБИТЫ И ВЗГЛЯДА ======
const EYE_ALT_M  = 10_000;        // высота зависания камеры (м)
const ORBIT_R_M  = 5_000;        // радиус орбиты (м)
const ORBIT_DEG_PER_SEC = 6;      // скорость вращения (град/сек)
const LOOK_REL_UP = 0.1;
const LOOK_AHEAD_M = 50_000;
const TICK_MS = 40;

// ====== НАСТРОЙКИ ОТОБРАЖЕНИЯ ======
// Масштабирование и смещение для скрытия черной полосы управления внизу карты
// OpenGlobus рендерит панель управления в нижней части (~13% высоты)
// Увеличиваем масштаб на 15% и смещаем вверх на 8%, чтобы обрезать нижнюю часть,
// при этом сохраняя видимость планеты, неба и маркеров
const MAP_SCALE_FACTOR = 1.5;     // увеличение на 15% для обрезки нижней части
const MAP_VERTICAL_OFFSET = '-30%'; // смещение вверх для центрирования планеты

const OG_MARKER = '/external/og/lib/res/marker.png';
const DEFAULT_CENTER = { lon: 30.36, lat: 59.94 };
const DEFAULT_LOGO = '/points/default.png';

type TourPoint = { lon: number; lat: number; img?: string; name?: string };

// ====== МАТЕМАТИКА ГЕОДЕЗИИ ======
const R_EARTH = 6371000;
const toRad = (d: number) => d * Math.PI / 180;
const toDeg = (r: number) => r * 180 / Math.PI;

// Смещение от (lon,lat) на distM по азимуту bearingDeg (0 — север, 90 — восток)
function destPoint(lon: number, lat: number, bearingDeg: number, distM: number) {
  const br = toRad(bearingDeg);
  const φ1 = toRad(lat);
  const λ1 = toRad(lon);
  const δ = distM / R_EARTH;

  const sinφ1 = Math.sin(φ1), cosφ1 = Math.cos(φ1);
  const sinδ = Math.sin(δ), cosδ = Math.cos(δ);

  const sinφ2 = sinφ1 * cosδ + cosφ1 * sinδ * Math.cos(br);
  const φ2 = Math.asin(sinφ2);

  const y = Math.sin(br) * sinδ * cosφ1;
  const x = cosδ - sinφ1 * sinφ2;
  const λ2 = λ1 + Math.atan2(y, x);

  return { lon: (toDeg(λ2) + 540) % 360 - 180, lat: toDeg(φ2) };
}

export default function OpenGlobusViewer({ ready = true }: { ready?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef     = useRef<any | null>(null);
  const ogRef        = useRef<any | null>(null);
  const loopRef      = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [mapSettings, setMapSettings] = useState({
    centerLon: DEFAULT_CENTER.lon,
    centerLat: DEFAULT_CENTER.lat,
    mapLogoPath: DEFAULT_LOGO,
  });
  const mapSettingsRef = useRef(mapSettings);
  useEffect(() => {
    mapSettingsRef.current = mapSettings;
  }, [mapSettings]);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/site-settings', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || !d) return;
        setMapSettings({
          centerLon: typeof d.mapCenterLon === 'number' ? d.mapCenterLon : DEFAULT_CENTER.lon,
          centerLat: typeof d.mapCenterLat === 'number' ? d.mapCenterLat : DEFAULT_CENTER.lat,
          mapLogoPath: typeof d.mapLogoPath === 'string' && d.mapLogoPath ? d.mapLogoPath : DEFAULT_LOGO,
        });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const tourPts = (useTourPoints() || []) as TourPoint[];
  const ptsRef  = useRef<TourPoint[]>([]);
  useEffect(() => { ptsRef.current = tourPts; }, [tourPts]);

  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  const pinSrcRef = useRef<string>(OG_MARKER);
  useEffect(() => {
    pinSrcRef.current = mapSettings.mapLogoPath || OG_MARKER;
  }, [mapSettings.mapLogoPath]);

  useEffect(() => {
    if (!ready || !containerRef.current) return;
    let destroyed = false;

    const stopLoop = () => { if (loopRef.current) { clearTimeout(loopRef.current); loopRef.current = null; } };

    (async () => {
      const og: any = await import('../../public/external/og/lib/og.es.js');
      if (destroyed) return;
      const { Globe, XYZ, Vector, Entity, LonLat } = og || {};
      if (!Globe || !XYZ || !Vector || !Entity || !LonLat) {
        console.error('OpenGlobus ESM: отсутствуют классы', { Globe, XYZ, Vector, Entity, LonLat });
        return;
      }
      ogRef.current = og;

      const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));

      // Слои
      const osm = new XYZ('osm', {
        isBaseLayer: true,
        url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        visibility: true,
        crossOrigin: 'anonymous',
        maxZoom: 19
      });
      const vect = new Vector('tour', { clampToGround: false, async: false, visibility: true });

      // Маркеры
      (ptsRef.current || []).forEach((p, idx) => {
        vect.add(new Entity({
          name: p.name || `P${idx + 1}`,
          lonlat: [p.lon, p.lat, 1],
          billboard: {
            src: p.img || pinSrcRef.current,
            width: 48,
            height: 48,
            offset: [0, 35],
          }
        }));
      });

      // Глобус
      const globe = new Globe({
        target: containerRef.current!,
        name: 'Earth',
        dpi: dpr,
        layers: [osm, vect],
        resourcesSrc: '/external/og/lib/res',
        fontsSrc: '/external/og/lib/res/fonts',
        maxLoading: 12
      });
      globeRef.current = globe;

      // Подгон под контейнер
      setTimeout(() => window.dispatchEvent(new Event('resize')), 0);

      // ===== Подлёт к центру (из настроек; ref чтобы не пересоздавать глобус при смене настроек — иначе createTextureDefault null) =====
      const settings = mapSettingsRef.current;
      const centerLon = settings.centerLon;
      const centerLat = settings.centerLat;
      const ell = globe.planet.ellipsoid;

      const centerLL = new LonLat(centerLon, centerLat, Math.max(200, EYE_ALT_M * Math.max(LOOK_REL_UP, 0.06)));
      const startAz  = 315;
      const eye0     = destPoint(centerLon, centerLat, startAz, ORBIT_R_M);
      const eyeLL0   = new LonLat(eye0.lon, eye0.lat, EYE_ALT_M);

      await new Promise<void>((resolve) => {
        globe.planet.camera.flyCartesian(
          ell.lonLatToCartesian(eyeLL0),
          {
            look: ell.lonLatToCartesian(centerLL),
            duration: 2200,
            completeCallback: () => resolve()
          }
        );
      });

      // ===== Бесконечная орбита =====
      let angle = startAz;
      const stepDeg = ORBIT_DEG_PER_SEC * (TICK_MS / 1000);

      const tick = () => {
        if (destroyed || pausedRef.current || !globeRef.current) return;

        angle = (angle + stepDeg) % 360;

        // Позиция камеры по орбите
        const eyeGeo = destPoint(centerLon, centerLat, angle, ORBIT_R_M);
        const eyeLL  = new og.LonLat(eyeGeo.lon, eyeGeo.lat, EYE_ALT_M);

        let lookLon = centerLon, lookLat = centerLat;
        if (LOOK_AHEAD_M > 0.1) {
          const ahead = destPoint(centerLon, centerLat, angle, LOOK_AHEAD_M);
          lookLon = ahead.lon; lookLat = ahead.lat;
        }
        const lookLL = new og.LonLat(lookLon, lookLat, Math.max(50, EYE_ALT_M * LOOK_REL_UP));

        globeRef.current.planet.camera.flyCartesian(
          ell.lonLatToCartesian(eyeLL),
          {
            look: ell.lonLatToCartesian(lookLL),
            duration: TICK_MS,
            completeCallback: () => {
              if (!destroyed && !pausedRef.current) {
                loopRef.current = setTimeout(tick, 0);
              }
            }
          }
        );
      };

      loopRef.current = setTimeout(tick, 200);
    })();

    return () => {
      destroyed = true;
      try { globeRef.current?.destroy?.(); } catch {}
      globeRef.current = null;
      ogRef.current = null;
      stopLoop();
    };
    // Не добавляем mapSettings: иначе при загрузке настроек с сервера глобус уничтожается и создаётся заново,
    // а старые тайлы OpenGlobus ещё грузятся → onload вызывает createTextureDefault у уже null handler.
  }, [ready, tourPts]);

  // Когда с сервера пришли новые центр/настройки — летим туда без пересоздания глобуса
  useEffect(() => {
    const globe = globeRef.current;
    const og = ogRef.current;
    if (!og?.LonLat || !globe?.planet?.camera || !globe.planet.ellipsoid) return;
    const ell = globe.planet.ellipsoid;
    const centerLL = new og.LonLat(mapSettings.centerLon, mapSettings.centerLat, 200);
    const eye0 = destPoint(mapSettings.centerLon, mapSettings.centerLat, 315, ORBIT_R_M);
    const eyeLL0 = new og.LonLat(eye0.lon, eye0.lat, EYE_ALT_M);
    globe.planet.camera.flyCartesian(ell.lonLatToCartesian(eyeLL0), {
      look: ell.lonLatToCartesian(centerLL),
      duration: 1500,
    });
  }, [mapSettings.centerLon, mapSettings.centerLat]);

  // Сняли паузу — мягкий рестарт
  useEffect(() => {
    if (!paused && !loopRef.current) {
      loopRef.current = setTimeout(() => {
        const evt = new Event('og:resume');
        window.dispatchEvent(evt);
      }, 150);
    }
  }, [paused]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 'inherit', overflow: 'hidden' }}>
      <div
        ref={containerRef}
        style={{ 
          position: 'absolute', 
          inset: 0, 
          borderRadius: 'inherit',
          transform: `scale(${MAP_SCALE_FACTOR}) translateY(${MAP_VERTICAL_OFFSET})`,
          transformOrigin: 'center center'
        }}
      />
      
    </div>
  );
}
