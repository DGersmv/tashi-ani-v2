-- CreateTable
CREATE TABLE "photo_folders" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "objectId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "photo_folders_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES "objects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_photos" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "objectId" INTEGER,
    "projectId" INTEGER,
    "stageId" INTEGER,
    "folderId" INTEGER,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "isVisibleToCustomer" BOOLEAN NOT NULL DEFAULT false,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "photos_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES "objects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "photos_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "photos_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "project_stages" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "photos_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "photo_folders" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_photos" ("filePath", "fileSize", "filename", "id", "isVisibleToCustomer", "mimeType", "objectId", "originalName", "projectId", "stageId", "uploadedAt") SELECT "filePath", "fileSize", "filename", "id", "isVisibleToCustomer", "mimeType", "objectId", "originalName", "projectId", "stageId", "uploadedAt" FROM "photos";
DROP TABLE "photos";
ALTER TABLE "new_photos" RENAME TO "photos";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
