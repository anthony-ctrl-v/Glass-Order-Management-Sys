import assert from "node:assert/strict";
import test from "node:test";
import { ConflictError } from "./errors.js";
import { assertOrderCanBeReleased, assertOrderNotReleased, buildPhysicalUnitSeeds } from "./physical-tracking.js";

test("builds stable unit and pane identifiers from order lines and specifications", () => {
  const units = buildPhysicalUnitSeeds(1042, [
    {
      id: "item-1",
      lineNumber: 2,
      quantity: 2,
      glassUnit: { panes: [{ id: "pane-spec-1", position: 1 }, { id: "pane-spec-2", position: 2 }] },
    },
    {
      id: "item-2",
      lineNumber: 4,
      quantity: 1,
      glassUnit: { panes: [{ id: "pane-spec-3", position: 1 }] },
    },
  ]);

  assert.deepEqual(units.map(({ orderItemId, unitNumber, identifier }) =>
    ({ orderItemId, unitNumber, identifier })), [
    { orderItemId: "item-1", unitNumber: 1, identifier: "1042-2-1" },
    { orderItemId: "item-1", unitNumber: 2, identifier: "1042-2-2" },
    { orderItemId: "item-2", unitNumber: 1, identifier: "1042-4-1" },
  ]);
  assert.deepEqual(units[0]?.panes.map(({ paneSpecificationId, panePosition, identifier }) =>
    ({ paneSpecificationId, panePosition, identifier })), [
    { paneSpecificationId: "pane-spec-1", panePosition: 1, identifier: "1042-2-1-1" },
    { paneSpecificationId: "pane-spec-2", panePosition: 2, identifier: "1042-2-1-2" },
  ]);
});

test("does not release an order without pane specifications", () => {
  assert.throws(() => buildPhysicalUnitSeeds(1042, [{
    id: "item-1",
    lineNumber: 1,
    quantity: 1,
    glassUnit: null,
  }]), ConflictError);
  assert.throws(() => buildPhysicalUnitSeeds(1042, []), ConflictError);
});

test("only unreleased OPEN orders can be released", () => {
  assert.doesNotThrow(() => assertOrderCanBeReleased({ status: "OPEN", releasedAt: null }));
  assert.throws(() => assertOrderCanBeReleased({ status: "DRAFT", releasedAt: null }), ConflictError);
  assert.throws(() => assertOrderCanBeReleased({ status: "CANCELLED", releasedAt: null }), ConflictError);
  assert.throws(() => assertOrderCanBeReleased({ status: "OPEN", releasedAt: new Date() }), ConflictError);
});

test("released orders reject content edits", () => {
  assert.doesNotThrow(() => assertOrderNotReleased({ releasedAt: null }));
  assert.throws(() => assertOrderNotReleased({ releasedAt: new Date() }), ConflictError);
});
