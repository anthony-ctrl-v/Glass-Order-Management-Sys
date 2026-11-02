import { z } from "zod";

const optionalText = z.string().trim().max(250).optional().nullable();

export const addressSchema = z.object({
  line1: optionalText,
  line2: optionalText,
  city: optionalText,
  region: optionalText,
  postalCode: optionalText,
  country: optionalText,
});

export const customerSchema = z.object({
  legalName: z.string().trim().min(1).max(200),
  phone: optionalText,
  email: z.string().trim().email().max(254).optional().nullable().or(z.literal("")),
  billingAddress: addressSchema.optional(),
  shippingAddress: addressSchema.optional(),
  contact: z.object({
    name: z.string().trim().min(1).max(150),
    phone: optionalText,
    email: z.string().trim().email().max(254).optional().nullable().or(z.literal("")),
    role: optionalText,
    notes: z.string().trim().max(2000).optional().nullable(),
  }),
});

const orderItemSchema = z.object({
  description: z.string().trim().min(1).max(500),
  quantity: z.number().int().positive().max(100_000),
  unitPrice: z.string().regex(/^\d{1,10}(\.\d{1,2})?$/, "Enter a non-negative price with up to two decimal places."),
});

export const createOrderSchema = z.object({
  customerId: z.string().min(1),
  dueDate: z.string().date().optional().or(z.literal("")),
  status: z.enum(["DRAFT", "OPEN"]).default("OPEN"),
  billingAddress: addressSchema.optional(),
  shippingAddress: addressSchema.optional(),
  shippingContact: z.object({
    name: optionalText,
    phone: optionalText,
    email: z.string().trim().email().max(254).optional().nullable().or(z.literal("")),
  }).optional(),
  items: z.array(orderItemSchema).min(1).max(100),
});

export const updateOrderSchema = z.object({
  dueDate: z.string().date().nullable().optional(),
  status: z.enum(["DRAFT", "OPEN", "CANCELLED"]).optional(),
  billingAddress: addressSchema.optional(),
  shippingAddress: addressSchema.optional(),
  shippingContact: z.object({
    name: optionalText,
    phone: optionalText,
    email: z.string().trim().email().max(254).optional().nullable().or(z.literal("")),
  }).optional(),
});
