export type PanoramaProjection = 'EQUIRECTANGULAR' | 'CYLINDRICAL' | 'UNKNOWN';

export interface PanoramaLike {
  originalWidth?: number | null;
  originalHeight?: number | null;
  projectionType?: PanoramaProjection | string | null;
}

export interface PanoramaPanoData {
  fullWidth: number;
  fullHeight: number;
  croppedWidth: number;
  croppedHeight: number;
  croppedX: number;
  croppedY: number;
}

export function classifyPanoramaProjection(
  width?: number | null,
  height?: number | null
): PanoramaProjection {
  if (!width || !height || width <= 0 || height <= 0) {
    return 'UNKNOWN';
  }

  const ratio = width / height;

  if (ratio > 1.7 && ratio < 2.3) {
    return 'EQUIRECTANGULAR';
  }

  if (ratio >= 2.3) {
    return 'CYLINDRICAL';
  }

  return 'UNKNOWN';
}

export function getPanoramaViewerPanoData(
  panorama: PanoramaLike | null | undefined
): PanoramaPanoData | null {
  if (!panorama) {
    return null;
  }

  const width = panorama.originalWidth ?? null;
  const height = panorama.originalHeight ?? null;
  if (!width || !height || width <= 0 || height <= 0) {
    return null;
  }

  const ratio = width / height;
  const projection =
    (panorama.projectionType ?? 'UNKNOWN').toString().toUpperCase() as PanoramaProjection;

  const isLikelyEquirectangular =
    projection === 'EQUIRECTANGULAR' ||
    (projection === 'UNKNOWN' && ratio > 1.7 && ratio < 2.3);

  if (isLikelyEquirectangular) {
    return null;
  }

  const fullWidth = width;
  let fullHeight = Math.max(Math.round(width / 2), 1);

  if (height > fullHeight) {
    fullHeight = height;
  }

  const croppedWidth = width;
  const croppedHeight = Math.min(height, fullHeight);
  const croppedY = Math.max(Math.round((fullHeight - croppedHeight) / 2), 0);

  return {
    fullWidth,
    fullHeight,
    croppedWidth,
    croppedHeight,
    croppedX: 0,
    croppedY,
  };
}

