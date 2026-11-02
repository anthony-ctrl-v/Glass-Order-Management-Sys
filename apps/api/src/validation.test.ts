import assert from "node:assert/strict";
import test from "node:test";
import { createOrderSchema } from "./validation.js";

const validOrder = {
  customerId: "customer-1",
  items: [{ description: "Clear monolithic", quantity: 2, unitPrice: "12.50" }],
};

test("accepts order prices with up to two decimal places", () => {
  const parsed = createOrderSchema.parse(validOrder);

  assert.equal(parsed.items[0]?.unitPrice, "12.50");
});

test("rejects order prices that exceed the database precision", () => {
  assert.throws(() => createOrderSchema.parse({
    ...validOrder,
    items: [{ description: "Clear monolithic", quantity: 1, unitPrice: "10000000000.00" }],
  }));
});

test("rejects order prices with more than two decimal places", () => {
  assert.throws(() => createOrderSchema.parse({
    ...validOrder,
    items: [{ description: "Clear monolithic", quantity: 1, unitPrice: "12.505" }],
  }));
});
