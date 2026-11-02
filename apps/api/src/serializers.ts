import { Prisma } from "@prisma/client";
import { glassUnitInclude, serializeUnit } from "./glass-specifications.js";

type OrderWithItems = Prisma.OrderGetPayload<{
  include: {
    items: { include: { glassUnit: { include: typeof glassUnitInclude } } };
    customer: true;
  };
}>;

export function serializeOrder(order: OrderWithItems) {
  const items = order.items.map((item) => ({
    ...item,
    unitPrice: item.unitPrice.toFixed(2),
    lineTotal: item.unitPrice.mul(item.quantity).toFixed(2),
    glassUnit: item.glassUnit ? serializeUnit(item.glassUnit) : null,
  }));
  const total = order.items.reduce(
    (sum, item) => sum.add(item.unitPrice.mul(item.quantity)),
    new Prisma.Decimal(0),
  );

  return {
    ...order,
    dueDate: order.dueDate?.toISOString().slice(0, 10) ?? null,
    totalPrice: total.toFixed(2),
    items,
  };
}
