import assert from "node:assert/strict";
import test from "node:test";
import { createOrderSchema, updateOrderItemSchema } from "./validation.js";

const validOrder = {
  customerId: "customer-1",
  items: [{
    description: "Clear monolithic",
    quantity: 2,
    unitPrice: "12.50",
    glassUnit: {
      overallWidth: 12,
      overallHeight: 12,
      construction: "MONOLITHIC",
      notes: "",
      panes: [{
        glassProductId: "glass-1",
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
      }],
      interlayers: [],
      cavities: [],
    },
  }],
};

test("requires a complete glass specification for every order item", () => {
  const { glassUnit: _glassUnit, ...itemWithoutSpecification } = validOrder.items[0]!;
  assert.throws(() => createOrderSchema.parse({
    ...validOrder,
    items: [itemWithoutSpecification],
  }));
});

test("accepts order prices with up to two decimal places", () => {
  const parsed = createOrderSchema.parse(validOrder);

  assert.equal(parsed.items[0]?.unitPrice, "12.50");
});

test("rejects order prices that exceed the database precision", () => {
  assert.throws(() => createOrderSchema.parse({
    ...validOrder,
    items: [{ ...validOrder.items[0]!, unitPrice: "10000000000.00" }],
  }));
});

test("rejects order prices with more than two decimal places", () => {
  assert.throws(() => createOrderSchema.parse({
    ...validOrder,
    items: [{ ...validOrder.items[0]!, unitPrice: "12.505" }],
  }));
});

test("accepts valid order-item quantity and price updates", () => {
  const parsed = updateOrderItemSchema.parse({ quantity: 4, unitPrice: "24.99" });

  assert.deepEqual(parsed, { quantity: 4, unitPrice: "24.99" });
});

test("rejects invalid quantities and prices for order-item updates", () => {
  for (const input of [
    { quantity: 0, unitPrice: "24.99" },
    { quantity: 1.5, unitPrice: "24.99" },
    { quantity: 100_001, unitPrice: "24.99" },
    { quantity: 2, unitPrice: "24.999" },
    { quantity: 2, unitPrice: "10000000000.00" },
  ]) {
    assert.equal(updateOrderItemSchema.safeParse(input).success, false);
  }
});
