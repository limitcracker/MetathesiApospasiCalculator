-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PlacementEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "schoolName" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "months" INTEGER NOT NULL DEFAULT 12,
    "msd" INTEGER NOT NULL,
    "isPrison" BOOLEAN NOT NULL DEFAULT false,
    "weeklyHours" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlacementEntry_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "PlacementGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PlacementEntry" ("createdAt", "groupId", "id", "isPrimary", "isPrison", "months", "msd", "schoolName", "updatedAt") SELECT "createdAt", "groupId", "id", "isPrimary", "isPrison", "months", "msd", "schoolName", "updatedAt" FROM "PlacementEntry";
DROP TABLE "PlacementEntry";
ALTER TABLE "new_PlacementEntry" RENAME TO "PlacementEntry";
CREATE TABLE "new_PlacementGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "year" INTEGER NOT NULL,
    "flowId" TEXT NOT NULL,
    "hasMarriage" BOOLEAN NOT NULL DEFAULT false,
    "childrenCount" INTEGER NOT NULL DEFAULT 0,
    "hasSynypiretisi" BOOLEAN NOT NULL DEFAULT false,
    "hasEntopiotita" BOOLEAN NOT NULL DEFAULT false,
    "proypiresiaYears" REAL NOT NULL DEFAULT 0,
    "hasStudies" BOOLEAN NOT NULL DEFAULT false,
    "hasIvf" BOOLEAN NOT NULL DEFAULT false,
    "hasFirstPreference" BOOLEAN NOT NULL DEFAULT false,
    "isSubstitute" BOOLEAN NOT NULL DEFAULT false,
    "totalWeeklyHours" INTEGER NOT NULL DEFAULT 0,
    "substituteMonths" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlacementGroup_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "Flow" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PlacementGroup" ("childrenCount", "createdAt", "flowId", "hasEntopiotita", "hasFirstPreference", "hasIvf", "hasMarriage", "hasStudies", "hasSynypiretisi", "id", "proypiresiaYears", "updatedAt", "year") SELECT "childrenCount", "createdAt", "flowId", "hasEntopiotita", "hasFirstPreference", "hasIvf", "hasMarriage", "hasStudies", "hasSynypiretisi", "id", "proypiresiaYears", "updatedAt", "year" FROM "PlacementGroup";
DROP TABLE "PlacementGroup";
ALTER TABLE "new_PlacementGroup" RENAME TO "PlacementGroup";
CREATE INDEX "PlacementGroup_year_idx" ON "PlacementGroup"("year");
CREATE UNIQUE INDEX "PlacementGroup_flowId_year_key" ON "PlacementGroup"("flowId", "year");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
