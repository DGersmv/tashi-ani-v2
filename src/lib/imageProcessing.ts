import sharp from 'sharp';

export interface ThumbnailOptions {
  width?: number;
  height?: number;
}

export interface ThumbnailResult {
  buffer: Buffer;
  width?: number;
  height?: number;
  mimeType: string;
}

const DEFAULT_WIDTH = 512;

export async function generateThumbnail(
  sourceBuffer: Buffer,
  options: ThumbnailOptions = {}
): Promise<ThumbnailResult> {
  const width = options.width ?? DEFAULT_WIDTH;
  const height = options.height;

  const transformer = sharp(sourceBuffer, { failOn: 'none' }).rotate();

  if (height) {
    transformer.resize({ width, height, fit: 'cover', withoutEnlargement: true });
  } else {
    transformer.resize({ width, withoutEnlargement: true });
  }

  const { data, info } = await transformer.toBuffer({ resolveWithObject: true });

  const mimeType = info.format ? `image/${info.format}` : 'image/jpeg';

  return {
    buffer: data,
    width: info.width,
    height: info.height,
    mimeType,
  };
}

