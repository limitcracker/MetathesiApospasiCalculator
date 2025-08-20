-- CreateTable
CREATE TABLE "Flow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Criterion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "FlowCriterion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "flowId" TEXT NOT NULL,
    "criterionId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL,
    CONSTRAINT "FlowCriterion_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "Flow" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FlowCriterion_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "Criterion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlacementGroup" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlacementGroup_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "Flow" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlacementEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "schoolName" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "months" INTEGER NOT NULL DEFAULT 12,
    "msd" INTEGER NOT NULL,
    "isPrison" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlacementEntry_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "PlacementGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Flow_slug_key" ON "Flow"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Criterion_key_key" ON "Criterion"("key");

-- CreateIndex
CREATE UNIQUE INDEX "FlowCriterion_flowId_criterionId_key" ON "FlowCriterion"("flowId", "criterionId");

-- CreateIndex
CREATE INDEX "PlacementGroup_year_idx" ON "PlacementGroup"("year");
