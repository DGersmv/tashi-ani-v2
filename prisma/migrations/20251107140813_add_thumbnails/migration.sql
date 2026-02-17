-- AlterTable
ALTER TABLE "panoramas" ADD COLUMN "thumbnailFilePath" TEXT;
ALTER TABLE "panoramas" ADD COLUMN "thumbnailFileSize" INTEGER;
ALTER TABLE "panoramas" ADD COLUMN "thumbnailFilename" TEXT;
ALTER TABLE "panoramas" ADD COLUMN "thumbnailHeight" INTEGER;
ALTER TABLE "panoramas" ADD COLUMN "thumbnailMimeType" TEXT;
ALTER TABLE "panoramas" ADD COLUMN "thumbnailWidth" INTEGER;

-- AlterTable
ALTER TABLE "photos" ADD COLUMN "thumbnailFilePath" TEXT;
ALTER TABLE "photos" ADD COLUMN "thumbnailFileSize" INTEGER;
ALTER TABLE "photos" ADD COLUMN "thumbnailFilename" TEXT;
ALTER TABLE "photos" ADD COLUMN "thumbnailHeight" INTEGER;
ALTER TABLE "photos" ADD COLUMN "thumbnailMimeType" TEXT;
ALTER TABLE "photos" ADD COLUMN "thumbnailWidth" INTEGER;
