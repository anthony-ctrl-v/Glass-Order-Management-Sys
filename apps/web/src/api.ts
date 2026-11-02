import type { Customer, GlassCatalogEntry, GlassUnit, GlassUnitInput, Order } from "./types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const body = await response.text();
  let result: unknown;
  try {
    result = body ? JSON.parse(body) as unknown : null;
  } catch {
    result = body;
  }

  if (!response.ok) {
    const message = typeof result === "object" && result !== null && "error" in result
      ? String(result.error)
      : typeof result === "string" && result
        ? result
        : `Request failed (${response.status}).`;
    throw new Error(message);
  }
  if (result === null) throw new Error("The server returned an empty response.");
  return result as T;
}

export const api = {
  customers: () => request<Customer[]>("/customers"),
  createCustomer: (body: unknown) =>
    request<Customer>("/customers", { method: "POST", body: JSON.stringify(body) }),
  updateCustomer: (id: string, body: unknown) =>
    request<Customer>(`/customers/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  orders: () => request<Order[]>("/orders"),
  createOrder: (body: unknown) =>
    request<Order>("/orders", { method: "POST", body: JSON.stringify(body) }),
  updateOrder: (id: string, body: unknown) =>
    request<Order>(`/orders/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  glassCatalogs: () => request<GlassCatalogEntry[]>("/glass-catalogs"),
  createGlassCatalog: (body: Omit<GlassCatalogEntry, "id">) =>
    request<GlassCatalogEntry>("/glass-catalogs", { method: "POST", body: JSON.stringify(body) }),
  updateGlassCatalog: (id: string, body: Partial<Omit<GlassCatalogEntry, "id">>) =>
    request<GlassCatalogEntry>(`/glass-catalogs/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  saveGlassUnit: (orderItemId: string, body: GlassUnitInput) =>
    request<GlassUnit>(`/order-items/${orderItemId}/glass-unit`, { method: "PUT", body: JSON.stringify(body) }),
};
