import fs from "fs";
import path from "path";

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".avif"];

export interface CarouselImage {
  src: string;
  title: string;
}

/**
 * Читает все изображения из папки и возвращает массив для DiagonalCarousel.
 * Вызывай на сервере — в page.tsx, layout.tsx или getStaticProps.
 *
 * @param folderPath  путь к папке относительно /public, например "/carousel"
 */
export function getCarouselImages(folderPath: string): CarouselImage[] {
  const absolutePath = path.join(process.cwd(), "public", folderPath);

  if (!fs.existsSync(absolutePath)) {
    console.warn(`[getCarouselImages] Папка не найдена: ${absolutePath}`);
    return [];
  }

  const files = fs.readdirSync(absolutePath);

  return files
    .filter((file) => IMAGE_EXTENSIONS.includes(path.extname(file).toLowerCase()))
    .sort() // сортируем по имени файла
    .map((file, i) => ({
      src: `${folderPath}/${file}`,
      // Название из имени файла: "01-shadow.jpg" → "01 SHADOW"
      title: path.basename(file, path.extname(file))
        .replace(/[-_]/g, " ")
        .toUpperCase(),
    }));
}