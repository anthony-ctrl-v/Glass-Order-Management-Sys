import { Router } from "express";
import { z } from "zod";
import { CatalogKind, Prisma } from "@prisma/client";
import { prisma } from "./db.js";
import { NotFoundError } from "./errors.js";
import { glassCatalogSchema, glassUnitSchema } from "./glass-validation.js";

export const glassCatalogRouter = Router();
export const glassSpecificationsRouter = Router();

glassCatalogRouter.get("/", async (_request, response, next) => {
  try {
    const entries = await prisma.glassCatalogEntry.findMany({
      orderBy: [{ kind: "asc" }, { name: "asc" }],
    });
    response.json(entries);
  } catch (error) {
    next(error);
  }
});

glassCatalogRouter.post("/", async (request, response, next) => {
  try {
    const input = glassCatalogSchema.parse(request.body);
    const entry = await prisma.glassCatalogEntry.create({ data: input });
    response.status(201).json(entry);
  } catch (error) {
    next(error);
  }
});

glassCatalogRouter.patch("/:id", async (request, response, next) => {
  try {
    const input = glassCatalogSchema.partial().parse(request.body);
    const existing = await prisma.glassCatalogEntry.findUnique({ where: { id: request.params.id } });
    if (!existing) throw new NotFoundError("Glass catalog entry not found.");
    if (input.kind !== undefined && input.kind !== existing.kind) {
      throw new z.ZodError([{
        code: "custom",
        path: ["kind"],
        message: "A catalog entry's category cannot be changed after it is created.",
      }]);
    }
    const entry = await prisma.glassCatalogEntry.update({
      where: { id: request.params.id },
      data: input,
    });
    response.json(entry);
  } catch (error) {
    next(error);
  }
});

export const glassUnitInclude = {
  panes: {
    orderBy: { position: "asc" as const },
    include: {
      glassProduct: true,
      surfaces: {
        orderBy: { side: "asc" as const },
        include: { treatments: { orderBy: { sequence: "asc" as const }, include: { treatment: true } } },
      },
    },
  },
  interlayers: {
    orderBy: [{ gapNumber: "asc" as const }, { sheetNumber: "asc" as const }],
    include: { material: true, color: true },
  },
  cavities: {
    orderBy: { gapNumber: "asc" as const },
    include: { spacerType: true, spacerColor: true },
  },
};

export function serializeUnit(unit: Prisma.GlassUnitGetPayload<{ include: typeof glassUnitInclude }>) {
  return {
    ...unit,
    overallWidth: unit.overallWidth.toString(),
    overallHeight: unit.overallHeight.toString(),
    panes: unit.panes.map((pane) => ({
      ...pane,
      width: pane.width.toString(),
      height: pane.height.toString(),
      thickness: pane.thickness.toString(),
      surfaces: pane.surfaces.map((surface) => ({
        ...surface,
        treatments: surface.treatments.map((treatment) => ({
          ...treatment,
          treatment: {
            ...treatment.treatment,
            kind: treatment.treatment.kind,
          },
        })),
      })),
    })),
    interlayers: unit.interlayers.map((layer) => ({
      ...layer,
      thickness: layer.thickness.toString(),
    })),
    cavities: unit.cavities.map((cavity) => ({
      ...cavity,
      width: cavity.width.toString(),
    })),
  };
}

function gapPaneIds(panes: Array<{ id: string }>, gapNumber: number) {
  const leftPane = panes[gapNumber - 1];
  const rightPane = panes[gapNumber];
  if (!leftPane || !rightPane) {
    throw new Error(`Glass gap ${gapNumber} does not have two adjacent panes.`);
  }
  return { leftPaneId: leftPane.id, rightPaneId: rightPane.id };
}

glassSpecificationsRouter.get("/:orderItemId/glass-unit", async (request, response, next) => {
  try {
    const unit = await prisma.glassUnit.findUnique({
      where: { orderItemId: request.params.orderItemId },
      include: glassUnitInclude,
    });
    response.json(unit ? serializeUnit(unit) : null);
  } catch (error) {
    next(error);
  }
});

glassSpecificationsRouter.put("/:orderItemId/glass-unit", async (request, response, next) => {
  try {
    const input = glassUnitSchema.parse(request.body);
    const orderItem = await prisma.orderItem.findUnique({ where: { id: request.params.orderItemId } });
    if (!orderItem) throw new NotFoundError("Order item not found.");

    const requestedCatalogEntries = [
      ...input.panes.map((pane) => ({ id: pane.glassProductId, kind: CatalogKind.GLASS_PRODUCT })),
      ...input.panes.flatMap((pane) => pane.surfaces.flatMap((surface) =>
        surface.treatmentIds.map((id) => ({ id, kind: CatalogKind.SURFACE_TREATMENT })))),
      ...input.interlayers.flatMap((layer) => [
        { id: layer.materialId, kind: CatalogKind.INTERLAYER_MATERIAL },
        { id: layer.colorId, kind: CatalogKind.INTERLAYER_COLOR },
      ]),
      ...input.cavities.flatMap((cavity) => [
        { id: cavity.spacerTypeId, kind: CatalogKind.SPACER_TYPE },
        { id: cavity.spacerColorId, kind: CatalogKind.SPACER_COLOR },
      ]),
    ];
    const catalogEntries = await prisma.glassCatalogEntry.findMany({
      where: { id: { in: [...new Set(requestedCatalogEntries.map((entry) => entry.id))] } },
      select: { id: true, kind: true },
    });
    const kindsById = new Map(catalogEntries.map((entry) => [entry.id, entry.kind]));
    for (const requested of requestedCatalogEntries) {
      if (kindsById.get(requested.id) !== requested.kind) {
        throw new z.ZodError([{
          code: "custom",
          path: ["catalog"],
          message: `A selected entry is missing or is not a ${requested.kind.toLowerCase().replaceAll("_", " ")} catalog entry.`,
        }]);
      }
    }

    const unit = await prisma.$transaction(async (transaction) => {
      await transaction.glassUnit.deleteMany({ where: { orderItemId: orderItem.id } });
      const createdUnit = await transaction.glassUnit.create({
        data: {
          orderItemId: orderItem.id,
          overallWidth: new Prisma.Decimal(input.overallWidth),
          overallHeight: new Prisma.Decimal(input.overallHeight),
          construction: input.construction,
          notes: input.notes,
          panes: {
            create: input.panes.map((pane, paneIndex) => ({
              position: paneIndex + 1,
              glassProduct: { connect: { id: pane.glassProductId } },
              width: new Prisma.Decimal(pane.width),
              height: new Prisma.Decimal(pane.height),
              thickness: new Prisma.Decimal(pane.thickness),
              heatTreatment: pane.heatTreatment,
              hasHoles: pane.hasHoles,
              flatPolish: pane.flatPolish,
              bevel: pane.bevel,
              surfaces: {
                create: pane.surfaces.map((surface) => ({
                  side: surface.side,
                  treatments: {
                    create: surface.treatmentIds.map((treatmentId, sequence) => ({
                      sequence: sequence + 1,
                      treatment: { connect: { id: treatmentId } },
                    })),
                  },
                })),
              },
            })),
          },
        },
        include: { panes: { orderBy: { position: "asc" } } },
      });
      await transaction.glassInterlayer.createMany({
        data: input.interlayers.map((layer) => ({
          glassUnitId: createdUnit.id,
          gapNumber: layer.gapNumber,
          sheetNumber: layer.sheetNumber,
          ...gapPaneIds(createdUnit.panes, layer.gapNumber),
          materialId: layer.materialId,
          colorId: layer.colorId,
          thickness: new Prisma.Decimal(layer.thickness),
          brand: layer.brand,
        })),
      });
      await transaction.insulatingCavity.createMany({
        data: input.cavities.map((cavity) => ({
          glassUnitId: createdUnit.id,
          gapNumber: cavity.gapNumber,
          ...gapPaneIds(createdUnit.panes, cavity.gapNumber),
          spacerTypeId: cavity.spacerTypeId,
          spacerColorId: cavity.spacerColorId,
          width: new Prisma.Decimal(cavity.width),
          gasFilled: cavity.gasFilled,
        })),
      });
      return transaction.glassUnit.findUniqueOrThrow({
        where: { id: createdUnit.id },
        include: glassUnitInclude,
      });
    });
    response.json(serializeUnit(unit));
  } catch (error) {
    next(error);
  }
});
