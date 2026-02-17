import {
    Globe,
    GlobusRgbTerrain,
    XYZ,
    Vector,
    Entity,
    LonLat
} from '/external/og/lib/og.es.js';

// --- Список точек тура: [lon, lat, height]
const TOUR_POINTS = [
  [32.2, 60.1, 10000],   // Ленобласть
  [30.31, 59.93, 10000], // СПб
  [32.39, 59.46, 9000],  // Кириши
  [32.35, 59.92, 9000],  // Волхов
];

const PAUSE_MS = 2200;

// --- Слой карты OSM
const osm = new XYZ("OpenStreetMap", {
  isBaseLayer: true,
  url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  visibility: true,
  attribution: 'Data © OpenStreetMap contributors, ODbL'
});

// --- Слой маркеров
const points = new Vector("points", { clampToGround: true, async: false });
TOUR_POINTS.forEach(([lon, lat], i) => {
  points.add(new Entity({
    name: `Метка ${i + 1}`,
    lonlat: [lon, lat],
    billboard: {
      src: '/external/og/lib/res/marker.png',
      size: [48, 48],
      offset: [0, 24]
    }
  }));
});

// --- Глобус
const globe = new Globe({
  target: "og-map",
  terrain: new GlobusRgbTerrain(),
  layers: [osm, points],
  resourcesSrc: "/external/og/lib/res",
  fontsSrc: "/external/og/lib/res/fonts"
});

// --- Тур по точкам (циклично!)
let tourIdx = 0;
function flyTour() {
  const n = TOUR_POINTS.length;
  const flyIdx = tourIdx % n;
  const lookIdx = (tourIdx + 1) % n;

  const destPos = new LonLat(...TOUR_POINTS[flyIdx]);
  const lookTo = new LonLat(...TOUR_POINTS[lookIdx]);
  const ell = globe.planet.ellipsoid;
  const lookCart = ell.lonLatToCartesian(lookTo);
  const upVec = ell.geodeticSurfaceNormal(ell.lonLatToCartesian(destPos));

  globe.planet.camera.flyLonLat(destPos, lookCart, upVec, 0, () => {
    tourIdx = (tourIdx + 1) % n;
    setTimeout(flyTour, PAUSE_MS);
  });
}

// --- Запускаем тур, когда всё нарисовано
globe.planet.events.on("draw", () => {
  setTimeout(flyTour, 1300);
});

// --- Добавить маркер по клику
globe.renderer.events.on("lclick", function (e) {
  var ll = globe.planet.getLonLatFromPixelTerrain(e, true);
  points.add(new Entity({
    name: 'New Marker',
    lonlat: ll,
    billboard: {
      src: '/external/og/lib/res/marker.png',
      size: [48, 48],
      offset: [0, 24]
    }
  }));
});

// --- Удалить маркер правой кнопкой
points.events.on("rclick", function (e) {
  e.pickingObject.remove();
});
