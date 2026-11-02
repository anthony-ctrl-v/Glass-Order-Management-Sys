import assert from "node:assert/strict";
import test from "node:test";
import { glassCatalogSchema, glassUnitSchema, validateLowESideSelections } from "./glass-validation.js";

const pane = {
  glassProductId: "glass-clear",
  width: 12,
  height: 12,
  thickness: 0.25,
  lowESide: null,
  heatTreatment: "NONE",
  hasHoles: false,
  flatPolish: false,
  bevel: false,
  surfaces: [
    { side: "A", treatmentIds: [] },
    { side: "B", treatmentIds: [] },
  ],
};

const monolithic = {
  overallWidth: 12,
  overallHeight: 12,
  construction: "MONOLITHIC",
  notes: "",
  panes: [pane],
  interlayers: [],
  cavities: [],
};

test("accepts a monolithic unit with exactly one pane and both surfaces", () => {
  assert.equal(glassUnitSchema.safeParse(monolithic).success, true);
});

test("records whether a glass product has a Low-E side", () => {
  const result = glassCatalogSchema.safeParse({
    kind: "GLASS_PRODUCT",
    name: "Low-E glass",
    hasLowESide: true,
  });
  assert.equal(result.success, true);
});

test("rejects Low-E side settings on non-glass catalog entries", () => {
  const result = glassCatalogSchema.safeParse({
    kind: "INTERLAYER_MATERIAL",
    name: "PVB",
    hasLowESide: true,
  });
  assert.equal(result.success, false);
});

test("requires a Low-E side for every pane using a Low-E glass product", () => {
  const result = glassUnitSchema.safeParse({
    ...monolithic,
    panes: [{ ...pane, lowESide: null }],
  });
  assert.equal(result.success, true);
  if (!result.success) return;
  const issues = validateLowESideSelections(result.data.panes, new Map([
    ["glass-clear", { hasLowESide: true }],
  ]));
  assert.equal(issues.length, 1);
  assert.deepEqual(issues[0]?.path, ["panes", 0, "lowESide"]);
});

test("accepts either pane surface as the Low-E side", () => {
  for (const lowESide of ["A", "B"] as const) {
    const result = glassUnitSchema.safeParse({
      ...monolithic,
      panes: [{ ...pane, lowESide }],
    });
    assert.equal(result.success, true);
    if (!result.success) continue;
    const issues = validateLowESideSelections(result.data.panes, new Map([
      ["glass-clear", { hasLowESide: true }],
    ]));
    assert.equal(issues.length, 0);
  }
});

test("rejects a Low-E side on a glass product not marked Low-E", () => {
  const result = glassUnitSchema.safeParse({
    ...monolithic,
    panes: [{ ...pane, lowESide: "A" }],
  });
  assert.equal(result.success, true);
  if (!result.success) return;
  const issues = validateLowESideSelections(result.data.panes, new Map([
    ["glass-clear", { hasLowESide: false }],
  ]));
  assert.equal(issues.length, 1);
});

test("rejects monolithic construction with multiple panes", () => {
  const result = glassUnitSchema.safeParse({ ...monolithic, panes: [pane, pane] });
  assert.equal(result.success, false);
});

test("requires one insulating cavity for every adjacent-pane gap", () => {
  const result = glassUnitSchema.safeParse({
    ...monolithic,
    construction: "INSULATED",
    panes: [pane, pane],
  });
  assert.equal(result.success, false);
});

test("accepts a laminated-insulated unit when separate gaps are laminated and insulated", () => {
  const result = glassUnitSchema.safeParse({
    ...monolithic,
    construction: "LAMINATED_INSULATED",
    panes: [pane, pane, pane],
    interlayers: [{ gapNumber: 1, sheetNumber: 1, materialId: "p", colorId: "clear", thickness: 0.03, brand: "" }],
    cavities: [
      { gapNumber: 2, spacerTypeId: "warm-edge", spacerColorId: "black", width: 0.5, gasFilled: true },
    ],
  });
  assert.equal(result.success, true);
});

test("rejects a laminated-insulated gap that is both laminated and insulated", () => {
  const result = glassUnitSchema.safeParse({
    ...monolithic,
    construction: "LAMINATED_INSULATED",
    panes: [pane, pane, pane],
    interlayers: [
      { gapNumber: 1, sheetNumber: 1, materialId: "p", colorId: "clear", thickness: 0.03, brand: "" },
      { gapNumber: 2, sheetNumber: 1, materialId: "p", colorId: "clear", thickness: 0.03, brand: "" },
    ],
    cavities: [
      { gapNumber: 1, spacerTypeId: "warm-edge", spacerColorId: "black", width: 0.5, gasFilled: true },
    ],
  });
  assert.equal(result.success, false);
});

test("requires every laminated-insulated gap to be assigned and requires both gap types", () => {
  const result = glassUnitSchema.safeParse({
    ...monolithic,
    construction: "LAMINATED_INSULATED",
    panes: [pane, pane, pane, pane],
    interlayers: [{ gapNumber: 1, sheetNumber: 1, materialId: "p", colorId: "clear", thickness: 0.03, brand: "" }],
    cavities: [{ gapNumber: 2, spacerTypeId: "warm-edge", spacerColorId: "black", width: 0.5, gasFilled: true }],
  });
  assert.equal(result.success, false);
});

test("requires at least three panes for separate laminated and insulating gaps", () => {
  const result = glassUnitSchema.safeParse({
    ...monolithic,
    construction: "LAMINATED_INSULATED",
    panes: [pane, pane],
    interlayers: [{ gapNumber: 1, sheetNumber: 1, materialId: "p", colorId: "clear", thickness: 0.03, brand: "" }],
    cavities: [],
  });
  assert.equal(result.success, false);
});

test("rejects construction details that point beyond the available pane gaps", () => {
  const result = glassUnitSchema.safeParse({
    ...monolithic,
    construction: "LAMINATED",
    panes: [pane, pane],
    interlayers: [
      { gapNumber: 2, sheetNumber: 1, materialId: "p", colorId: "clear", thickness: 0.03, brand: "" },
    ],
  });
  assert.equal(result.success, false);
});

test("requires interlayer sheets in each gap to use consecutive sequence numbers", () => {
  const result = glassUnitSchema.safeParse({
    ...monolithic,
    construction: "LAMINATED",
    panes: [pane, pane],
    interlayers: [
      { gapNumber: 1, sheetNumber: 1, materialId: "p", colorId: "clear", thickness: 0.03, brand: "" },
      { gapNumber: 1, sheetNumber: 3, materialId: "p", colorId: "clear", thickness: 0.03, brand: "" },
    ],
  });
  assert.equal(result.success, false);
});
