-- CreateEnum
CREATE TYPE "CatalogKind" AS ENUM ('GLASS_PRODUCT', 'SURFACE_TREATMENT', 'INTERLAYER_MATERIAL', 'INTERLAYER_COLOR', 'SPACER_TYPE', 'SPACER_COLOR');

-- CreateEnum
CREATE TYPE "GlassUnitConstruction" AS ENUM ('MONOLITHIC', 'INSULATED', 'LAMINATED', 'LAMINATED_INSULATED');

-- CreateEnum
CREATE TYPE "PaneHeatTreatment" AS ENUM ('NONE', 'TEMPERED', 'HEAT_STRENGTHENED');

-- CreateEnum
CREATE TYPE "SurfaceSide" AS ENUM ('A', 'B');

-- CreateTable
CREATE TABLE "GlassCatalogEntry" (
    "id" TEXT NOT NULL,
    "kind" "CatalogKind" NOT NULL,
    "name" TEXT NOT NULL,
    "manufacturer" TEXT,
    "description" TEXT,
    "facilityWorkRequired" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlassCatalogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlassUnit" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "overallWidth" DECIMAL(10,4) NOT NULL,
    "overallHeight" DECIMAL(10,4) NOT NULL,
    "construction" "GlassUnitConstruction" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlassUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaneSpecification" (
    "id" TEXT NOT NULL,
    "glassUnitId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "glassProductId" TEXT NOT NULL,
    "width" DECIMAL(10,4) NOT NULL,
    "height" DECIMAL(10,4) NOT NULL,
    "thickness" DECIMAL(10,4) NOT NULL,
    "heatTreatment" "PaneHeatTreatment" NOT NULL DEFAULT 'NONE',
    "hasHoles" BOOLEAN NOT NULL DEFAULT false,
    "flatPolish" BOOLEAN NOT NULL DEFAULT false,
    "bevel" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaneSpecification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaneSurface" (
    "id" TEXT NOT NULL,
    "paneId" TEXT NOT NULL,
    "side" "SurfaceSide" NOT NULL,

    CONSTRAINT "PaneSurface_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaneSurfaceTreatment" (
    "id" TEXT NOT NULL,
    "surfaceId" TEXT NOT NULL,
    "treatmentId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,

    CONSTRAINT "PaneSurfaceTreatment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlassInterlayer" (
    "id" TEXT NOT NULL,
    "glassUnitId" TEXT NOT NULL,
    "gapNumber" INTEGER NOT NULL,
    "sheetNumber" INTEGER NOT NULL,
    "leftPaneId" TEXT NOT NULL,
    "rightPaneId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "colorId" TEXT NOT NULL,
    "thickness" DECIMAL(10,4) NOT NULL,
    "brand" TEXT,

    CONSTRAINT "GlassInterlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsulatingCavity" (
    "id" TEXT NOT NULL,
    "glassUnitId" TEXT NOT NULL,
    "gapNumber" INTEGER NOT NULL,
    "leftPaneId" TEXT NOT NULL,
    "rightPaneId" TEXT NOT NULL,
    "spacerTypeId" TEXT NOT NULL,
    "spacerColorId" TEXT NOT NULL,
    "width" DECIMAL(10,4) NOT NULL,
    "gasFilled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "InsulatingCavity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GlassCatalogEntry_kind_active_name_idx" ON "GlassCatalogEntry"("kind", "active", "name");

-- CreateIndex
CREATE UNIQUE INDEX "GlassCatalogEntry_kind_name_key" ON "GlassCatalogEntry"("kind", "name");

-- CreateIndex
CREATE UNIQUE INDEX "GlassUnit_orderItemId_key" ON "GlassUnit"("orderItemId");

-- CreateIndex
CREATE INDEX "PaneSpecification_glassProductId_idx" ON "PaneSpecification"("glassProductId");

-- CreateIndex
CREATE UNIQUE INDEX "PaneSpecification_glassUnitId_position_key" ON "PaneSpecification"("glassUnitId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "PaneSurface_paneId_side_key" ON "PaneSurface"("paneId", "side");

-- CreateIndex
CREATE INDEX "PaneSurfaceTreatment_treatmentId_idx" ON "PaneSurfaceTreatment"("treatmentId");

-- CreateIndex
CREATE UNIQUE INDEX "PaneSurfaceTreatment_surfaceId_sequence_key" ON "PaneSurfaceTreatment"("surfaceId", "sequence");

-- CreateIndex
CREATE INDEX "GlassInterlayer_leftPaneId_rightPaneId_idx" ON "GlassInterlayer"("leftPaneId", "rightPaneId");

-- CreateIndex
CREATE UNIQUE INDEX "GlassInterlayer_glassUnitId_gapNumber_sheetNumber_key" ON "GlassInterlayer"("glassUnitId", "gapNumber", "sheetNumber");

-- CreateIndex
CREATE INDEX "InsulatingCavity_leftPaneId_rightPaneId_idx" ON "InsulatingCavity"("leftPaneId", "rightPaneId");

-- CreateIndex
CREATE UNIQUE INDEX "InsulatingCavity_glassUnitId_gapNumber_key" ON "InsulatingCavity"("glassUnitId", "gapNumber");

-- AddForeignKey
ALTER TABLE "GlassUnit" ADD CONSTRAINT "GlassUnit_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaneSpecification" ADD CONSTRAINT "PaneSpecification_glassUnitId_fkey" FOREIGN KEY ("glassUnitId") REFERENCES "GlassUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaneSpecification" ADD CONSTRAINT "PaneSpecification_glassProductId_fkey" FOREIGN KEY ("glassProductId") REFERENCES "GlassCatalogEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaneSurface" ADD CONSTRAINT "PaneSurface_paneId_fkey" FOREIGN KEY ("paneId") REFERENCES "PaneSpecification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaneSurfaceTreatment" ADD CONSTRAINT "PaneSurfaceTreatment_surfaceId_fkey" FOREIGN KEY ("surfaceId") REFERENCES "PaneSurface"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaneSurfaceTreatment" ADD CONSTRAINT "PaneSurfaceTreatment_treatmentId_fkey" FOREIGN KEY ("treatmentId") REFERENCES "GlassCatalogEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlassInterlayer" ADD CONSTRAINT "GlassInterlayer_glassUnitId_fkey" FOREIGN KEY ("glassUnitId") REFERENCES "GlassUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlassInterlayer" ADD CONSTRAINT "GlassInterlayer_leftPaneId_fkey" FOREIGN KEY ("leftPaneId") REFERENCES "PaneSpecification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlassInterlayer" ADD CONSTRAINT "GlassInterlayer_rightPaneId_fkey" FOREIGN KEY ("rightPaneId") REFERENCES "PaneSpecification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlassInterlayer" ADD CONSTRAINT "GlassInterlayer_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "GlassCatalogEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlassInterlayer" ADD CONSTRAINT "GlassInterlayer_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "GlassCatalogEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsulatingCavity" ADD CONSTRAINT "InsulatingCavity_glassUnitId_fkey" FOREIGN KEY ("glassUnitId") REFERENCES "GlassUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsulatingCavity" ADD CONSTRAINT "InsulatingCavity_leftPaneId_fkey" FOREIGN KEY ("leftPaneId") REFERENCES "PaneSpecification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsulatingCavity" ADD CONSTRAINT "InsulatingCavity_rightPaneId_fkey" FOREIGN KEY ("rightPaneId") REFERENCES "PaneSpecification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsulatingCavity" ADD CONSTRAINT "InsulatingCavity_spacerTypeId_fkey" FOREIGN KEY ("spacerTypeId") REFERENCES "GlassCatalogEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsulatingCavity" ADD CONSTRAINT "InsulatingCavity_spacerColorId_fkey" FOREIGN KEY ("spacerColorId") REFERENCES "GlassCatalogEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
