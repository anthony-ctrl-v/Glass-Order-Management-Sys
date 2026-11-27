-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "releasedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PhysicalGlassUnit" ADD COLUMN     "identifier" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "PhysicalPane" ADD COLUMN     "identifier" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "PhysicalGlassUnit_identifier_key" ON "PhysicalGlassUnit"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "PhysicalPane_identifier_key" ON "PhysicalPane"("identifier");
