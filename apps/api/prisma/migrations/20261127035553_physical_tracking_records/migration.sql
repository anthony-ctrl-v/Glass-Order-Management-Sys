-- CreateTable
CREATE TABLE "PhysicalGlassUnit" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "unitNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhysicalGlassUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhysicalPane" (
    "id" TEXT NOT NULL,
    "physicalUnitId" TEXT NOT NULL,
    "paneSpecificationId" TEXT NOT NULL,
    "panePosition" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhysicalPane_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PhysicalGlassUnit_orderItemId_unitNumber_key" ON "PhysicalGlassUnit"("orderItemId", "unitNumber");

-- CreateIndex
CREATE INDEX "PhysicalPane_paneSpecificationId_idx" ON "PhysicalPane"("paneSpecificationId");

-- CreateIndex
CREATE UNIQUE INDEX "PhysicalPane_physicalUnitId_panePosition_key" ON "PhysicalPane"("physicalUnitId", "panePosition");

-- CreateIndex
CREATE UNIQUE INDEX "PhysicalPane_physicalUnitId_paneSpecificationId_key" ON "PhysicalPane"("physicalUnitId", "paneSpecificationId");

-- AddForeignKey
ALTER TABLE "PhysicalGlassUnit" ADD CONSTRAINT "PhysicalGlassUnit_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysicalPane" ADD CONSTRAINT "PhysicalPane_physicalUnitId_fkey" FOREIGN KEY ("physicalUnitId") REFERENCES "PhysicalGlassUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysicalPane" ADD CONSTRAINT "PhysicalPane_paneSpecificationId_fkey" FOREIGN KEY ("paneSpecificationId") REFERENCES "PaneSpecification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
