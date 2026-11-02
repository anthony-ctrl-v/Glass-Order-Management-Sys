import { Router } from "express";
import { prisma } from "./db.js";
import { customerSchema } from "./validation.js";

export const customersRouter = Router();

const customerInclude = { contact: true } as const;

customersRouter.get("/", async (_request, response, next) => {
  try {
    const customers = await prisma.customer.findMany({
      include: customerInclude,
      orderBy: { legalName: "asc" },
    });
    response.json(customers);
  } catch (error) {
    next(error);
  }
});

customersRouter.post("/", async (request, response, next) => {
  try {
    const input = customerSchema.parse(request.body);
    const customer = await prisma.customer.create({
      data: {
        legalName: input.legalName,
        phone: input.phone || null,
        email: input.email || null,
        billingAddressLine1: input.billingAddress?.line1 || null,
        billingAddressLine2: input.billingAddress?.line2 || null,
        billingCity: input.billingAddress?.city || null,
        billingRegion: input.billingAddress?.region || null,
        billingPostalCode: input.billingAddress?.postalCode || null,
        billingCountry: input.billingAddress?.country || null,
        shippingAddressLine1: input.shippingAddress?.line1 || null,
        shippingAddressLine2: input.shippingAddress?.line2 || null,
        shippingCity: input.shippingAddress?.city || null,
        shippingRegion: input.shippingAddress?.region || null,
        shippingPostalCode: input.shippingAddress?.postalCode || null,
        shippingCountry: input.shippingAddress?.country || null,
        contact: {
          create: {
            name: input.contact.name,
            phone: input.contact.phone || null,
            email: input.contact.email || null,
            role: input.contact.role || null,
            notes: input.contact.notes || null,
          },
        },
      },
      include: customerInclude,
    });
    response.status(201).json(customer);
  } catch (error) {
    next(error);
  }
});

customersRouter.put("/:id", async (request, response, next) => {
  try {
    const input = customerSchema.parse(request.body);
    const customer = await prisma.customer.update({
      where: { id: request.params.id },
      data: {
        legalName: input.legalName,
        phone: input.phone || null,
        email: input.email || null,
        billingAddressLine1: input.billingAddress?.line1 || null,
        billingAddressLine2: input.billingAddress?.line2 || null,
        billingCity: input.billingAddress?.city || null,
        billingRegion: input.billingAddress?.region || null,
        billingPostalCode: input.billingAddress?.postalCode || null,
        billingCountry: input.billingAddress?.country || null,
        shippingAddressLine1: input.shippingAddress?.line1 || null,
        shippingAddressLine2: input.shippingAddress?.line2 || null,
        shippingCity: input.shippingAddress?.city || null,
        shippingRegion: input.shippingAddress?.region || null,
        shippingPostalCode: input.shippingAddress?.postalCode || null,
        shippingCountry: input.shippingAddress?.country || null,
        contact: {
          upsert: {
            create: {
              name: input.contact.name,
              phone: input.contact.phone || null,
              email: input.contact.email || null,
              role: input.contact.role || null,
              notes: input.contact.notes || null,
            },
            update: {
              name: input.contact.name,
              phone: input.contact.phone || null,
              email: input.contact.email || null,
              role: input.contact.role || null,
              notes: input.contact.notes || null,
            },
          },
        },
      },
      include: customerInclude,
    });
    response.json(customer);
  } catch (error) {
    next(error);
  }
});
