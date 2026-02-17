-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_panorama_comments" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "panoramaId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "yaw" REAL,
    "pitch" REAL,
    "isAdminComment" BOOLEAN NOT NULL DEFAULT false,
    "isReadByAdmin" BOOLEAN NOT NULL DEFAULT false,
    "isReadByCustomer" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "panorama_comments_panoramaId_fkey" FOREIGN KEY ("panoramaId") REFERENCES "panoramas" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "panorama_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_panorama_comments" ("content", "createdAt", "id", "isAdminComment", "isReadByAdmin", "isReadByCustomer", "panoramaId", "pitch", "userId", "yaw") SELECT "content", "createdAt", "id", "isAdminComment", "isReadByAdmin", "isReadByCustomer", "panoramaId", "pitch", "userId", "yaw" FROM "panorama_comments";
DROP TABLE "panorama_comments";
ALTER TABLE "new_panorama_comments" RENAME TO "panorama_comments";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
