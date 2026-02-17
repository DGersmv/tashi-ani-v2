declare module '@openglobus/og/Globe';
declare module '@openglobus/og/terrain/GlobusTerrain';
declare module '@openglobus/og/layer/XYZ';
declare module '@openglobus/og/layer/Vector';
declare module '@openglobus/og/shape/Entity';
declare module '@openglobus/og/math/LonLat';

export {};

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- globals from og.js
    og: any;
  }
}
