-- CreateTable
CREATE TABLE "panorama_comments" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "panoramaId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "yaw" REAL NOT NULL,
    "pitch" REAL NOT NULL,
    "isAdminComment" BOOLEAN NOT NULL DEFAULT false,
    "isReadByAdmin" BOOLEAN NOT NULL DEFAULT false,
    "isReadByCustomer" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "panorama_comments_panoramaId_fkey" FOREIGN KEY ("panoramaId") REFERENCES "panoramas" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "panorama_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
