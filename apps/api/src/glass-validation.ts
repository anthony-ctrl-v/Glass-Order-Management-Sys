import { CatalogKind, PaneHeatTreatment, SurfaceSide } from "@prisma/client";
import { z } from "zod";

const glassCatalogFieldsSchema = z.object({
  kind: z.nativeEnum(CatalogKind),
  name: z.string().trim().min(1).max(200),
  manufacturer: z.string().trim().max(200).optional().nullable(),
  description: z.string().trim().max(1000).optional().nullable(),
  hasLowESide: z.boolean().default(false),
  facilityWorkRequired: z.boolean().default(false),
  active: z.boolean().default(true),
});

export const glassCatalogSchema = glassCatalogFieldsSchema.superRefine((entry, context) => {
  if (entry.kind !== CatalogKind.GLASS_PRODUCT && entry.hasLowESide) {
    context.addIssue({ code: "custom", path: ["hasLowESide"], message: "Only glass products can have a Low-E side." });
  }
});

export const updateGlassCatalogSchema = glassCatalogFieldsSchema.partial().superRefine((entry, context) => {
  if (entry.kind !== undefined && entry.kind !== CatalogKind.GLASS_PRODUCT && entry.hasLowESide) {
    context.addIssue({ code: "custom", path: ["hasLowESide"], message: "Only glass products can have a Low-E side." });
  }
});

export const glassUnitSchema = z.object({
  overallWidth: z.number().positive().max(100_000),
  overallHeight: z.number().positive().max(100_000),
  construction: z.enum(["MONOLITHIC", "INSULATED", "LAMINATED", "LAMINATED_INSULATED"]),
  notes: z.string().trim().max(2000).optional().nullable(),
  panes: z.array(z.object({
    glassProductId: z.string().min(1),
    width: z.number().positive().max(100_000),
    height: z.number().positive().max(100_000),
    thickness: z.number().positive().max(100),
    lowESide: z.nativeEnum(SurfaceSide).nullable(),
    heatTreatment: z.nativeEnum(PaneHeatTreatment),
    hasHoles: z.boolean(),
    flatPolish: z.boolean(),
    bevel: z.boolean(),
    surfaces: z.array(z.object({
      side: z.nativeEnum(SurfaceSide),
      treatmentIds: z.array(z.string().min(1)),
    }).superRefine((surface, context) => {
      if (new Set(surface.treatmentIds).size !== surface.treatmentIds.length) {
        context.addIssue({ code: "custom", path: ["treatmentIds"], message: "A surface cannot use the same treatment more than once." });
      }
    })).length(2),
  })).min(1).max(20),
  interlayers: z.array(z.object({
    gapNumber: z.number().int().positive(),
    sheetNumber: z.number().int().positive(),
    materialId: z.string().min(1),
    colorId: z.string().min(1),
    thickness: z.number().positive().max(100),
    brand: z.string().trim().max(200).optional().nullable(),
  })).max(100),
  cavities: z.array(z.object({
    gapNumber: z.number().int().positive(),
    spacerTypeId: z.string().min(1),
    spacerColorId: z.string().min(1),
    width: z.number().positive().max(100),
    gasFilled: z.boolean(),
  })).max(19),
}).superRefine((unit, context) => {
  const gapCount = unit.panes.length - 1;
  const isLaminatedInsulated = unit.construction === "LAMINATED_INSULATED";

  if (unit.construction === "MONOLITHIC" && unit.panes.length !== 1) {
    context.addIssue({ code: "custom", path: ["panes"], message: "Monolithic glass must have exactly one pane." });
  }
  if (unit.construction !== "MONOLITHIC" && unit.panes.length < 2) {
    context.addIssue({ code: "custom", path: ["panes"], message: "This construction requires at least two panes." });
  }
  if (isLaminatedInsulated && unit.panes.length < 3) {
    context.addIssue({ code: "custom", path: ["panes"], message: "Laminated-insulated construction requires at least three panes so lamination and insulation occupy separate gaps." });
  }

  unit.panes.forEach((pane, index) => {
    const sides = pane.surfaces.map((surface) => surface.side);
    if (new Set(sides).size !== 2 || !sides.includes("A") || !sides.includes("B")) {
      context.addIssue({ code: "custom", path: ["panes", index, "surfaces"], message: "Each pane must define Side A and Side B exactly once." });
    }
  });

  const expectedGaps = new Set(Array.from({ length: Math.max(gapCount, 0) }, (_, index) => index + 1));
  const interlayerGaps = new Set(unit.interlayers.map((layer) => layer.gapNumber));
  const cavityGaps = new Set(unit.cavities.map((cavity) => cavity.gapNumber));

  for (const layer of unit.interlayers) {
    if (!expectedGaps.has(layer.gapNumber)) {
      context.addIssue({ code: "custom", path: ["interlayers"], message: "Interlayers must reference a gap between adjacent panes." });
    }
  }
  for (const cavity of unit.cavities) {
    if (!expectedGaps.has(cavity.gapNumber)) {
      context.addIssue({ code: "custom", path: ["cavities"], message: "Cavities must reference a gap between adjacent panes." });
    }
  }
  for (const gap of expectedGaps) {
    const hasInterlayer = interlayerGaps.has(gap);
    const hasCavity = cavityGaps.has(gap);
    if (isLaminatedInsulated && hasInterlayer && hasCavity) {
      context.addIssue({ code: "custom", path: ["interlayers", "cavities"], message: `Gap ${gap} cannot be both laminated and insulated.` });
    } else if (isLaminatedInsulated && !hasInterlayer && !hasCavity) {
      context.addIssue({ code: "custom", path: ["interlayers", "cavities"], message: `Choose either lamination or an insulating cavity for gap ${gap}.` });
    } else if (unit.construction === "LAMINATED" && !hasInterlayer) {
      context.addIssue({ code: "custom", path: ["interlayers"], message: `Laminated construction requires an interlayer in gap ${gap}.` });
    }
    if (unit.construction === "INSULATED" && !hasCavity) {
      context.addIssue({ code: "custom", path: ["cavities"], message: `Insulated construction requires a cavity in gap ${gap}.` });
    }
    if (unit.construction === "MONOLITHIC" && (hasInterlayer || hasCavity)) {
      context.addIssue({ code: "custom", path: ["interlayers", "cavities"], message: "Monolithic construction cannot have interlayers or insulating cavities." });
    }
    if (unit.construction !== "LAMINATED" && !isLaminatedInsulated && hasInterlayer) {
      context.addIssue({ code: "custom", path: ["interlayers"], message: "Interlayers are only valid for laminated construction." });
    }
    if (unit.construction !== "INSULATED" && !isLaminatedInsulated && hasCavity) {
      context.addIssue({ code: "custom", path: ["cavities"], message: "Cavities are only valid for insulated construction." });
    }
  }
  if (isLaminatedInsulated && ![...interlayerGaps].some((gap) => expectedGaps.has(gap))) {
    context.addIssue({ code: "custom", path: ["interlayers"], message: "Laminated-insulated construction requires at least one laminated gap." });
  }
  if (isLaminatedInsulated && ![...cavityGaps].some((gap) => expectedGaps.has(gap))) {
    context.addIssue({ code: "custom", path: ["cavities"], message: "Laminated-insulated construction requires at least one insulating gap." });
  }
  for (const gapNumber of expectedGaps) {
    const sheetNumbers = unit.interlayers
      .filter((layer) => layer.gapNumber === gapNumber)
      .map((layer) => layer.sheetNumber)
      .sort((left, right) => left - right);
    if (sheetNumbers.some((sheetNumber, index) => sheetNumber !== index + 1)) {
      context.addIssue({ code: "custom", path: ["interlayers"], message: `Interlayer sheets in gap ${gapNumber} must be numbered consecutively from 1.` });
    }
  }
  if (unit.cavities.length !== cavityGaps.size) {
    context.addIssue({ code: "custom", path: ["cavities"], message: "Each pane gap can have only one insulating cavity." });
  }
});

export function validateLowESideSelections(
  panes: z.infer<typeof glassUnitSchema>["panes"],
  products: Map<string, { hasLowESide: boolean }>,
) {
  const issues: z.ZodIssue[] = [];
  panes.forEach((pane, index) => {
    const product = products.get(pane.glassProductId);
    if (!product) return;
    if (product.hasLowESide && pane.lowESide === null) {
      issues.push({
        code: "custom",
        path: ["panes", index, "lowESide"],
        message: "Choose whether the product's Low-E side faces Side A or Side B.",
      });
    } else if (!product.hasLowESide && pane.lowESide !== null) {
      issues.push({
        code: "custom",
        path: ["panes", index, "lowESide"],
        message: "This glass product does not have a Low-E side.",
      });
    }
  });
  return issues;
}
