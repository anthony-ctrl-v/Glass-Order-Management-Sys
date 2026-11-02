-- AlterTable
ALTER TABLE "GlassCatalogEntry" ADD COLUMN     "hasLowESide" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "PaneSpecification" ADD COLUMN     "lowESide" "SurfaceSide";
