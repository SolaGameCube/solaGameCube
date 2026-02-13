-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Game" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "shortDesc" TEXT NOT NULL,
    "orientation" TEXT NOT NULL DEFAULT 'landscape',
    "isBanner" BOOLEAN NOT NULL DEFAULT false,
    "isHot" BOOLEAN NOT NULL DEFAULT false,
    "bannerImage" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Game" ("bannerImage", "createdAt", "description", "icon", "id", "isActive", "isBanner", "name", "orientation", "shortDesc", "sortOrder", "updatedAt", "url") SELECT "bannerImage", "createdAt", "description", "icon", "id", "isActive", "isBanner", "name", "orientation", "shortDesc", "sortOrder", "updatedAt", "url" FROM "Game";
DROP TABLE "Game";
ALTER TABLE "new_Game" RENAME TO "Game";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
