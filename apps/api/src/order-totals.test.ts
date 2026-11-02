import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "@prisma/client";
import { calculateLineTotal, calculateOrderTotal } from "./order-totals.js";

test("calculates a line total from quantity and saved unit price", () => {
  const total = calculateLineTotal({
    quantity: 3,
    unitPrice: new Prisma.Decimal("19.95"),
  });

  assert.equal(total.toFixed(2), "59.85");
});

test("sums line totals without floating-point rounding errors", () => {
  const total = calculateOrderTotal([
    { quantity: 3, unitPrice: new Prisma.Decimal("19.95") },
    { quantity: 2, unitPrice: new Prisma.Decimal("0.10") },
  ]);

  assert.equal(total.toFixed(2), "60.05");
});
