import { Prisma } from "@prisma/client";
import { Router } from "express";
import { prisma } from "./db.js";
import { ConflictError, NotFoundError } from "./errors.js";
import { glassUnitInclude, saveGlassUnitForOrderItem } from "./glass-specifications.js";
import { lockOrder } from "./order-lock.js";
import { assertOrderCanBeReleased, assertOrderNotReleased, buildPhysicalUnitSeeds } from "./physical-tracking.js";
import { serializeOrder } from "./serializers.js";
import { createOrderSchema, updateOrderItemSchema, updateOrderSchema } from "./validation.js";

export const ordersRouter = Router();

const orderInclude = {
  items: { orderBy: { lineNumber: "asc" as const }, include: { glassUnit: { include: glassUnitInclude } } },
  customer: true,
} as const;

ordersRouter.get("/", async (_request, response, next) => {
  try {
    const orders = await prisma.order.findMany({
      include: orderInclude,
      orderBy: { createdAt: "desc" },
    });
    response.json(orders.map(serializeOrder));
  } catch (error) {
    next(error);
  }
});

ordersRouter.get("/:id", async (request, response, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: request.params.id },
      include: orderInclude,
    });
    if (!order) {
      response.status(404).json({ error: "Order not found." });
      return;
    }
    response.json(serializeOrder(order));
  } catch (error) {
    next(error);
  }
});

ordersRouter.post("/", async (request, response, next) => {
  try {
    const input = createOrderSchema.parse(request.body);
    const order = await prisma.$transaction(async (transaction) => {
      const customer = await transaction.customer.findUnique({
        where: { id: input.customerId },
        include: { contact: true },
      });
      if (!customer) {
        throw new NotFoundError("Customer not found.");
      }

      const data: Prisma.OrderCreateInput = {
        status: input.status,
        dueDate: input.dueDate ? new Date(`${input.dueDate}T00:00:00.000Z`) : null,
        customer: { connect: { id: customer.id } },
        billingAddressLine1: input.billingAddress?.line1 ?? customer.billingAddressLine1,
        billingAddressLine2: input.billingAddress?.line2 ?? customer.billingAddressLine2,
        billingCity: input.billingAddress?.city ?? customer.billingCity,
        billingRegion: input.billingAddress?.region ?? customer.billingRegion,
        billingPostalCode: input.billingAddress?.postalCode ?? customer.billingPostalCode,
        billingCountry: input.billingAddress?.country ?? customer.billingCountry,
        shippingAddressLine1: input.shippingAddress?.line1 ?? customer.shippingAddressLine1,
        shippingAddressLine2: input.shippingAddress?.line2 ?? customer.shippingAddressLine2,
        shippingCity: input.shippingAddress?.city ?? customer.shippingCity,
        shippingRegion: input.shippingAddress?.region ?? customer.shippingRegion,
        shippingPostalCode: input.shippingAddress?.postalCode ?? customer.shippingPostalCode,
        shippingCountry: input.shippingAddress?.country ?? customer.shippingCountry,
        shippingContactName: input.shippingContact?.name ?? customer.contact?.name ?? null,
        shippingContactPhone: input.shippingContact?.phone ?? customer.contact?.phone ?? null,
        shippingContactEmail: input.shippingContact?.email ?? customer.contact?.email ?? null,
        items: {
          create: input.items.map((item, index) => ({
            lineNumber: index + 1,
            description: item.description,
            quantity: item.quantity,
            unitPrice: new Prisma.Decimal(item.unitPrice),
          })),
        },
      };

      const createdOrder = await transaction.order.create({ data, include: orderInclude });
      for (const [index, orderItem] of createdOrder.items.entries()) {
        const itemInput = input.items[index];
        if (!itemInput) throw new Error("Order items do not match their glass specifications.");
        await saveGlassUnitForOrderItem(transaction, orderItem.id, itemInput.glassUnit);
      }
      return transaction.order.findUniqueOrThrow({
        where: { id: createdOrder.id },
        include: orderInclude,
      });
    });
    response.status(201).json(serializeOrder(order));
  } catch (error) {
    next(error);
  }
});

ordersRouter.post("/:id/release", async (request, response, next) => {
  try {
    const order = await prisma.$transaction(async (transaction) => {
      const lockedOrder = await lockOrder(transaction, request.params.id);
      if (!lockedOrder) throw new NotFoundError("Order not found.");
      assertOrderCanBeReleased(lockedOrder);

      const orderToRelease = await transaction.order.findUnique({
        where: { id: request.params.id },
        include: orderInclude,
      });
      if (!orderToRelease) throw new NotFoundError("Order not found.");

      const unitSeeds = buildPhysicalUnitSeeds(orderToRelease.orderNumber, orderToRelease.items);
      await transaction.order.update({
        where: { id: orderToRelease.id },
        data: { releasedAt: new Date() },
      });

      const createdUnits = await transaction.physicalGlassUnit.createManyAndReturn({
        data: unitSeeds.map(({ panes: _panes, ...unit }) => unit),
        select: { id: true, orderItemId: true, unitNumber: true },
      });
      const unitsByKey = new Map(createdUnits.map((unit) => [
        `${unit.orderItemId}:${unit.unitNumber}`,
        unit,
      ]));
      const paneRecords = unitSeeds.flatMap((unitSeed) => {
        const unit = unitsByKey.get(`${unitSeed.orderItemId}:${unitSeed.unitNumber}`);
        if (!unit) throw new Error("A released physical unit was not returned by the database.");
        return unitSeed.panes.map((pane) => ({
          physicalUnitId: unit.id,
          ...pane,
        }));
      });
      await transaction.physicalPane.createMany({ data: paneRecords });

      return transaction.order.findUniqueOrThrow({
        where: { id: orderToRelease.id },
        include: orderInclude,
      });
    });
    response.json(serializeOrder(order));
  } catch (error) {
    next(error);
  }
});

ordersRouter.patch("/:id/items/:itemId", async (request, response, next) => {
  try {
    const input = updateOrderItemSchema.parse(request.body);
    const updatedItem = await prisma.$transaction(async (transaction) => {
      const order = await lockOrder(transaction, request.params.id);
      if (!order) throw new NotFoundError("Order not found.");
      const orderItem = await transaction.orderItem.findFirst({
        where: { id: request.params.itemId, orderId: request.params.id },
        select: { id: true },
      });
      if (!orderItem) throw new NotFoundError("Order item not found.");
      if (order.status === "CANCELLED") {
        throw new ConflictError("Items on cancelled orders cannot be edited.");
      }
      assertOrderNotReleased(order);

      return transaction.orderItem.update({
        where: { id: orderItem.id },
        data: {
          quantity: input.quantity,
          unitPrice: new Prisma.Decimal(input.unitPrice),
        },
      });
    });
    response.json({
      ...updatedItem,
      unitPrice: updatedItem.unitPrice.toFixed(2),
      lineTotal: updatedItem.unitPrice.mul(updatedItem.quantity).toFixed(2),
    });
  } catch (error) {
    next(error);
  }
});

ordersRouter.patch("/:id", async (request, response, next) => {
  try {
    const input = updateOrderSchema.parse(request.body);
    const order = await prisma.$transaction(async (transaction) => {
      const lockedOrder = await lockOrder(transaction, request.params.id);
      if (!lockedOrder) throw new NotFoundError("Order not found.");
      const hasContentChanges = input.dueDate !== undefined
        || input.billingAddress !== undefined
        || input.shippingAddress !== undefined
        || input.shippingContact !== undefined;
      if (lockedOrder.releasedAt && hasContentChanges) {
        assertOrderNotReleased(lockedOrder);
      }
      if (
        lockedOrder.releasedAt
        && input.status !== undefined
        && input.status !== lockedOrder.status
        && input.status !== "CANCELLED"
      ) {
        throw new ConflictError("A released order can only be cancelled.");
      }

      const data: Prisma.OrderUpdateInput = {};
      if (input.status !== undefined) data.status = input.status;
      if (input.dueDate !== undefined) {
        data.dueDate = input.dueDate ? new Date(`${input.dueDate}T00:00:00.000Z`) : null;
      }
      if (input.billingAddress) {
        data.billingAddressLine1 = input.billingAddress.line1;
        data.billingAddressLine2 = input.billingAddress.line2;
        data.billingCity = input.billingAddress.city;
        data.billingRegion = input.billingAddress.region;
        data.billingPostalCode = input.billingAddress.postalCode;
        data.billingCountry = input.billingAddress.country;
      }
      if (input.shippingAddress) {
        data.shippingAddressLine1 = input.shippingAddress.line1;
        data.shippingAddressLine2 = input.shippingAddress.line2;
        data.shippingCity = input.shippingAddress.city;
        data.shippingRegion = input.shippingAddress.region;
        data.shippingPostalCode = input.shippingAddress.postalCode;
        data.shippingCountry = input.shippingAddress.country;
      }
      if (input.shippingContact) {
        data.shippingContactName = input.shippingContact.name;
        data.shippingContactPhone = input.shippingContact.phone;
        data.shippingContactEmail = input.shippingContact.email;
      }
      return transaction.order.update({
        where: { id: request.params.id },
        data,
        include: orderInclude,
      });
    });
    response.json(serializeOrder(order));
  } catch (error) {
    next(error);
  }
});
