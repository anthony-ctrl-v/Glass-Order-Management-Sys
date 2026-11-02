export type Address = {
  line1: string;
  line2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
};

export type Contact = {
  name: string;
  phone: string | null;
  email: string | null;
  role: string | null;
  notes: string | null;
};

export type Customer = {
  id: string;
  legalName: string;
  phone: string | null;
  email: string | null;
  billingAddressLine1: string | null;
  billingAddressLine2: string | null;
  billingCity: string | null;
  billingRegion: string | null;
  billingPostalCode: string | null;
  billingCountry: string | null;
  shippingAddressLine1: string | null;
  shippingAddressLine2: string | null;
  shippingCity: string | null;
  shippingRegion: string | null;
  shippingPostalCode: string | null;
  shippingCountry: string | null;
  contact: Contact | null;
};

export type OrderItem = {
  id: string;
  lineNumber: number;
  description: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
};

export type Order = {
  id: string;
  orderNumber: number;
  status: "DRAFT" | "OPEN" | "CANCELLED";
  dueDate: string | null;
  createdAt: string;
  totalPrice: string;
  customer: Customer;
  items: OrderItem[];
};
