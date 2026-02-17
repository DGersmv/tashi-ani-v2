ALTER TABLE "panoramas" ADD COLUMN "originalWidth" INTEGER;
ALTER TABLE "panoramas" ADD COLUMN "originalHeight" INTEGER;
ALTER TABLE "panoramas" ADD COLUMN "projectionType" TEXT NOT NULL DEFAULT 'EQUIRECTANGULAR';

