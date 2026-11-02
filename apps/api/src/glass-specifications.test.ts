import assert from "node:assert/strict";
import test from "node:test";
import { glassUnitSchema } from "./glass-validation.js";

const pane = {
  glassProductId: "glass-clear",
  width: 12,
  height: 12,
  thickness: 0.25,
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

test("accepts matching laminated-insulated interlayers and cavities", () => {
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
      { gapNumber: 2, spacerTypeId: "warm-edge", spacerColorId: "black", width: 0.5, gasFilled: true },
    ],
  });
  assert.equal(result.success, true);
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
