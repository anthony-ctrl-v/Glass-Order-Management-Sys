import { Fragment, useEffect, useMemo, useState, type FormEvent } from "react";
import { api } from "./api";
import { GlassCatalogManager } from "./GlassCatalogManager";
import { GlassUnitEditor } from "./GlassUnitEditor";
import { formatInches } from "./format-inches";
import type { Customer, GlassCatalogEntry, GlassUnit, Order } from "./types";

type CustomerForm = {
  legalName: string;
  phone: string;
  email: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  contactRole: string;
  contactNotes: string;
  billingLine1: string;
  billingLine2: string;
  billingCity: string;
  billingRegion: string;
  billingPostalCode: string;
  billingCountry: string;
  shippingLine1: string;
  shippingLine2: string;
  shippingCity: string;
  shippingRegion: string;
  shippingPostalCode: string;
  shippingCountry: string;
};

type ItemDraft = {
  description: string;
  quantity: number;
  unitPrice: string;
};

const emptyCustomer: CustomerForm = {
  legalName: "",
  phone: "",
  email: "",
  contactName: "",
  contactPhone: "",
  contactEmail: "",
  contactRole: "",
  contactNotes: "",
  billingLine1: "",
  billingLine2: "",
  billingCity: "",
  billingRegion: "",
  billingPostalCode: "",
  billingCountry: "United States",
  shippingLine1: "",
  shippingLine2: "",
  shippingCity: "",
  shippingRegion: "",
  shippingPostalCode: "",
  shippingCountry: "United States",
};

const emptyItem: ItemDraft = { description: "", quantity: 1, unitPrice: "" };

function addressFields(line1: string, line2: string, city: string, region: string, postalCode: string, country: string) {
  return { line1, line2, city, region, postalCode, country };
}

function customerAddress(customer: Customer | undefined, type: "billing" | "shipping") {
  if (!customer) return { line1: "", line2: "", city: "", region: "", postalCode: "", country: "" };
  return type === "billing"
    ? {
        line1: customer.billingAddressLine1 ?? "",
        line2: customer.billingAddressLine2 ?? "",
        city: customer.billingCity ?? "",
        region: customer.billingRegion ?? "",
        postalCode: customer.billingPostalCode ?? "",
        country: customer.billingCountry ?? "",
      }
    : {
        line1: customer.shippingAddressLine1 ?? "",
        line2: customer.shippingAddressLine2 ?? "",
        city: customer.shippingCity ?? "",
        region: customer.shippingRegion ?? "",
        postalCode: customer.shippingPostalCode ?? "",
        country: customer.shippingCountry ?? "",
      };
}

function formatCurrency(value: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value));
}

export default function App() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [glassCatalogs, setGlassCatalogs] = useState<GlassCatalogEntry[]>([]);
  const [activeView, setActiveView] = useState<"orders" | "catalogs">("orders");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [editingSpecItemId, setEditingSpecItemId] = useState<string | null>(null);
  const [customerForm, setCustomerForm] = useState<CustomerForm>(emptyCustomer);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [billingSnapshot, setBillingSnapshot] = useState(customerAddress(undefined, "billing"));
  const [shippingSnapshot, setShippingSnapshot] = useState(customerAddress(undefined, "shipping"));
  const [shippingContact, setShippingContact] = useState({ name: "", phone: "", email: "" });
  const [dueDate, setDueDate] = useState("");
  const [items, setItems] = useState<ItemDraft[]>([{ ...emptyItem }]);
  const [loading, setLoading] = useState(true);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function refresh() {
    setError("");
    try {
      const [customerRows, orderRows, catalogRows] = await Promise.all([api.customers(), api.orders(), api.glassCatalogs()]);
      setCustomers(customerRows);
      setOrders(orderRows);
      setGlassCatalogs(catalogRows);
      setSelectedCustomerId((current) => current || customerRows[0]?.id || "");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load records.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId);
  const draftTotal = useMemo(
    () => items.reduce((total, item) => total + (Number(item.unitPrice) || 0) * item.quantity, 0),
    [items],
  );

  useEffect(() => {
    if (!selectedCustomer) return;
    setBillingSnapshot(customerAddress(selectedCustomer, "billing"));
    setShippingSnapshot(customerAddress(selectedCustomer, "shipping"));
    setShippingContact({
      name: selectedCustomer.contact?.name ?? "",
      phone: selectedCustomer.contact?.phone ?? "",
      email: selectedCustomer.contact?.email ?? "",
    });
  }, [selectedCustomer]);

  async function submitCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingCustomer(true);
    setError("");
    setNotice("");
    try {
      const customerInput = {
        legalName: customerForm.legalName,
        phone: customerForm.phone || null,
        email: customerForm.email || null,
        billingAddress: addressFields(customerForm.billingLine1, customerForm.billingLine2, customerForm.billingCity, customerForm.billingRegion, customerForm.billingPostalCode, customerForm.billingCountry),
        shippingAddress: addressFields(customerForm.shippingLine1, customerForm.shippingLine2, customerForm.shippingCity, customerForm.shippingRegion, customerForm.shippingPostalCode, customerForm.shippingCountry),
        contact: {
          name: customerForm.contactName,
          phone: customerForm.contactPhone || null,
          email: customerForm.contactEmail || null,
          role: customerForm.contactRole || null,
          notes: customerForm.contactNotes || null,
        },
      };
      const saved = editingCustomerId
        ? await api.updateCustomer(editingCustomerId, customerInput)
        : await api.createCustomer(customerInput);
      const wasEditing = Boolean(editingCustomerId);
      setEditingCustomerId(null);
      setCustomerForm(emptyCustomer);
      await refresh();
      setSelectedCustomerId(saved.id);
      setNotice(`${saved.legalName} was ${wasEditing ? "updated" : "added"}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save customer.");
    } finally {
      setSavingCustomer(false);
    }
  }

  function editCustomer(customer: Customer) {
    setEditingCustomerId(customer.id);
    setCustomerForm({
      legalName: customer.legalName,
      phone: customer.phone ?? "",
      email: customer.email ?? "",
      contactName: customer.contact?.name ?? "",
      contactPhone: customer.contact?.phone ?? "",
      contactEmail: customer.contact?.email ?? "",
      contactRole: customer.contact?.role ?? "",
      contactNotes: customer.contact?.notes ?? "",
      billingLine1: customer.billingAddressLine1 ?? "",
      billingLine2: customer.billingAddressLine2 ?? "",
      billingCity: customer.billingCity ?? "",
      billingRegion: customer.billingRegion ?? "",
      billingPostalCode: customer.billingPostalCode ?? "",
      billingCountry: customer.billingCountry ?? "",
      shippingLine1: customer.shippingAddressLine1 ?? "",
      shippingLine2: customer.shippingAddressLine2 ?? "",
      shippingCity: customer.shippingCity ?? "",
      shippingRegion: customer.shippingRegion ?? "",
      shippingPostalCode: customer.shippingPostalCode ?? "",
      shippingCountry: customer.shippingCountry ?? "",
    });
    setError("");
    setNotice("");
  }

  async function changeOrderStatus(order: Order, status: Order["status"]) {
    setError("");
    setNotice("");
    try {
      await api.updateOrder(order.id, { status });
      await refresh();
      setNotice(`Order ${order.orderNumber} status updated.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update order status.");
    }
  }

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCustomer) return;
    setSavingOrder(true);
    setError("");
    setNotice("");
    try {
      const created = await api.createOrder({
        customerId: selectedCustomer.id,
        dueDate,
        billingAddress: billingSnapshot,
        shippingAddress: shippingSnapshot,
        shippingContact,
        items: items.map((item) => ({
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: item.unitPrice,
        })),
      });
      setItems([{ ...emptyItem }]);
      setDueDate("");
      await refresh();
      setNotice(`Order ${created.orderNumber} was created.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create order.");
    } finally {
      setSavingOrder(false);
    }
  }

  function updateItem(index: number, patch: Partial<ItemDraft>) {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Glassworks home">
          <span className="brand-mark">G</span>
          <span>Glassworks <small>ORDER MANAGEMENT</small></span>
        </a>
        <nav className="topbar-nav" aria-label="Main navigation">
          <button type="button" className={activeView === "orders" ? "active" : ""} onClick={() => setActiveView("orders")}>Orders</button>
          <button type="button" className={activeView === "catalogs" ? "active" : ""} onClick={() => setActiveView("catalogs")}>Glass catalogs</button>
        </nav>
        <span className="topbar-label">Milestone 2 · Glass specifications</span>
      </header>

      <main className="page">
        <section className="intro">
          <div>
            <p className="eyebrow">WORKSPACE / {activeView === "orders" ? "ORDERS" : "GLASS CATALOGS"}</p>
            <h1>{activeView === "orders" ? "Orders, with the glass details." : "Manage glass reference data."}</h1>
            <p className="intro-copy">{activeView === "orders" ? "Review order items and add their structured glass-unit specifications." : "Maintain the product and process catalogs used by glass-unit specifications."}</p>
          </div>
          <div className="intro-stat"><strong>{activeView === "orders" ? orders.length : glassCatalogs.length}</strong><span>{activeView === "orders" ? "orders on file" : "catalog entries"}</span></div>
        </section>

        {error && <div className="alert error" role="alert">{error}</div>}
        {notice && <div className="alert success" role="status">{notice}</div>}
        {loading ? <div className="loading">Loading customer and order records…</div> : (
          activeView === "catalogs" ? (
            <GlassCatalogManager entries={glassCatalogs} onChanged={() => void refresh()} />
          ) : <div className="workspace-grid">
            <section className="panel orders-panel">
              <div className="panel-heading">
                <div><p className="eyebrow">ORDER REGISTER</p><h2>Recent orders</h2></div>
                <span className="count-pill">{orders.length}</span>
              </div>
              {orders.length === 0 ? (
                <div className="empty-state"><span className="empty-icon">◇</span><strong>No orders yet</strong><p>Create a customer, then add your first order.</p></div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>ORDER</th><th>CUSTOMER</th><th>CREATED</th><th>DUE</th><th>STATUS</th><th className="align-right">TOTAL</th><th>DETAILS</th></tr></thead>
                    <tbody>{orders.map((order) => (
                      <Fragment key={order.id}>
                        <tr>
                          <td><strong className="order-number">#{order.orderNumber}</strong><span className="line-count">{order.items.length} line{order.items.length === 1 ? "" : "s"}</span></td>
                          <td>{order.customer.legalName}</td>
                          <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                          <td>{order.dueDate ? new Date(`${order.dueDate}T00:00:00`).toLocaleDateString() : <span className="muted">—</span>}</td>
                          <td><select className={`status-select ${order.status.toLowerCase()}`} aria-label={`Order ${order.orderNumber} status`} value={order.status} onChange={(event) => void changeOrderStatus(order, event.target.value as Order["status"])}><option value="DRAFT">Draft</option><option value="OPEN">Open</option><option value="CANCELLED">Cancelled</option></select></td>
                          <td className="align-right">{formatCurrency(order.totalPrice)}</td>
                          <td><button className="edit-button" type="button" aria-expanded={expandedOrderId === order.id} onClick={() => { setExpandedOrderId(expandedOrderId === order.id ? null : order.id); setEditingSpecItemId(null); }}>{expandedOrderId === order.id ? "Hide" : "Items"}</button></td>
                        </tr>
                        {expandedOrderId === order.id && <tr key={`${order.id}-details`} className="order-detail-row"><td colSpan={7}>
                          <div className="order-items-detail">{order.items.map((item) => <section className="order-item-detail" key={item.id}>
                            <div className="item-detail-heading"><div><strong>Line {item.lineNumber}: {item.description}</strong><span>{item.quantity} unit{item.quantity === 1 ? "" : "s"} · {formatCurrency(item.unitPrice)} each</span></div><button className="edit-button" type="button" aria-expanded={editingSpecItemId === item.id} onClick={() => setEditingSpecItemId(editingSpecItemId === item.id ? null : item.id)}>{editingSpecItemId === item.id ? "Close editor" : item.glassUnit ? "Edit specification" : "Add specification"}</button></div>
                            {item.glassUnit ? <GlassUnitSummary unit={item.glassUnit} /> : <p className="form-hint">No structured glass specification has been saved for this order item yet.</p>}
                            {editingSpecItemId === item.id && <GlassUnitEditor orderItemId={item.id} unit={item.glassUnit} catalogs={glassCatalogs} onSaved={() => void refresh()} />}
                          </section>)}</div>
                        </td></tr>}
                      </Fragment>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="panel create-order-panel">
              <div className="panel-heading"><div><p className="eyebrow">NEW RECORD</p><h2>Create an order</h2></div><span className="panel-step">01</span></div>
              {customers.length === 0 ? (
                <div className="empty-inline">Add a customer first to create an order.</div>
              ) : (
                <form onSubmit={submitOrder} className="form-stack">
                  <label>Customer<select required value={selectedCustomerId} onChange={(event) => setSelectedCustomerId(event.target.value)}>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.legalName}</option>)}</select></label>
                  <label>Due date <span className="optional">optional</span><input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label>
                  <div className="section-rule"><span>ORDER ADDRESSES</span></div>
                  <OrderAddressForm title="Billing address snapshot" value={billingSnapshot} onChange={setBillingSnapshot} />
                  <OrderAddressForm title="Shipping address snapshot" value={shippingSnapshot} onChange={setShippingSnapshot} />
                  <div className="section-rule"><span>SHIPPING CONTACT</span></div>
                  <p className="form-hint">Prefilled from the customer’s default contact. Changes apply to this order only.</p>
                  <label>Contact name<input value={shippingContact.name} onChange={(event) => setShippingContact({ ...shippingContact, name: event.target.value })} /></label>
                  <div className="line-fields">
                    <label>Contact phone<input type="tel" value={shippingContact.phone} onChange={(event) => setShippingContact({ ...shippingContact, phone: event.target.value })} /></label>
                    <label>Contact email<input type="email" value={shippingContact.email} onChange={(event) => setShippingContact({ ...shippingContact, email: event.target.value })} /></label>
                  </div>
                  <div className="section-rule"><span>ORDER ITEMS</span><button type="button" className="text-button" onClick={() => setItems((current) => [...current, { ...emptyItem }])}>+ Add line</button></div>
                  <div className="order-lines">
                    {items.map((item, index) => (
                      <div className="order-line" key={index}>
                        <div className="line-title">Line {index + 1}{items.length > 1 && <button type="button" className="remove-button" aria-label={`Remove line ${index + 1}`} onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}>×</button>}</div>
                        <label>Glass make / description<input required maxLength={500} placeholder="e.g. Clear monolithic glass" value={item.description} onChange={(event) => updateItem(index, { description: event.target.value })} /></label>
                        <div className="line-fields">
                          <label>Quantity<input required type="number" min="1" step="1" value={item.quantity} onChange={(event) => updateItem(index, { quantity: Number(event.target.value) })} /></label>
                          <label>Unit price<input required type="number" min="0" step="0.01" value={item.unitPrice} placeholder="0.00" onChange={(event) => updateItem(index, { unitPrice: event.target.value })} /></label>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="total-row"><span>Calculated order total</span><strong>{formatCurrency(draftTotal.toFixed(2))}</strong></div>
                  <button className="primary-button" disabled={savingOrder || !selectedCustomerId}>{savingOrder ? "Creating order…" : "Create order"}<span>→</span></button>
                </form>
              )}
            </section>

            <section className="panel customer-panel">
              <div className="panel-heading"><div><p className="eyebrow">CUSTOMER DIRECTORY</p><h2>Add a customer</h2></div><span className="panel-step">02</span></div>
              <form onSubmit={submitCustomer} className="form-stack">
                <label>Company legal name<input required maxLength={200} value={customerForm.legalName} onChange={(event) => setCustomerForm({ ...customerForm, legalName: event.target.value })} placeholder="Company, Inc." /></label>
                <div className="line-fields">
                  <label>Company phone<input type="tel" value={customerForm.phone} onChange={(event) => setCustomerForm({ ...customerForm, phone: event.target.value })} /></label>
                  <label>Company email<input type="email" value={customerForm.email} onChange={(event) => setCustomerForm({ ...customerForm, email: event.target.value })} /></label>
                </div>
                <div className="section-rule"><span>DEFAULT CONTACT</span></div>
                <label>Contact name<input required maxLength={150} value={customerForm.contactName} onChange={(event) => setCustomerForm({ ...customerForm, contactName: event.target.value })} /></label>
                <div className="line-fields">
                  <label>Contact phone<input type="tel" value={customerForm.contactPhone} onChange={(event) => setCustomerForm({ ...customerForm, contactPhone: event.target.value })} /></label>
                  <label>Contact email<input type="email" value={customerForm.contactEmail} onChange={(event) => setCustomerForm({ ...customerForm, contactEmail: event.target.value })} /></label>
                </div>
                <div className="line-fields">
                  <label>Role / title <span className="optional">optional</span><input value={customerForm.contactRole} onChange={(event) => setCustomerForm({ ...customerForm, contactRole: event.target.value })} /></label>
                  <label>Contact notes <span className="optional">optional</span><input value={customerForm.contactNotes} onChange={(event) => setCustomerForm({ ...customerForm, contactNotes: event.target.value })} /></label>
                </div>
                <div className="section-rule"><span>DEFAULT ADDRESSES</span></div>
                <AddressForm title="Billing address" prefix="billing" form={customerForm} setForm={setCustomerForm} />
                <AddressForm title="Shipping address" prefix="shipping" form={customerForm} setForm={setCustomerForm} />
                <div className="form-actions">
                  <button className="primary-button" disabled={savingCustomer}>{savingCustomer ? "Saving customer…" : editingCustomerId ? "Update customer" : "Save customer"}<span>→</span></button>
                  {editingCustomerId && <button type="button" className="secondary-button" onClick={() => { setEditingCustomerId(null); setCustomerForm(emptyCustomer); }}>Cancel edit</button>}
                </div>
              </form>
            </section>

            <section className="panel directory-panel">
              <div className="panel-heading"><div><p className="eyebrow">SAVED ACCOUNTS</p><h2>Customers</h2></div><span className="count-pill">{customers.length}</span></div>
              {customers.length === 0 ? <p className="muted">Customer accounts will appear here.</p> : (
                <ul className="customer-list">{customers.map((customer) => <li key={customer.id}><span className="customer-avatar">{customer.legalName.slice(0, 1).toUpperCase()}</span><span className="customer-info"><strong>{customer.legalName}</strong><small>{customer.contact?.name ?? "No default contact"}{customer.email ? ` · ${customer.email}` : ""}</small></span><button type="button" className="edit-button" onClick={() => editCustomer(customer)}>Edit</button></li>)}</ul>
              )}
            </section>
          </div>
        )}
        <footer>Glassworks Order Management <span>·</span> Milestone 2 of 4</footer>
      </main>
    </div>
  );
}

type OrderAddressFormProps = {
  title: string;
  value: ReturnType<typeof customerAddress>;
  onChange: (value: ReturnType<typeof customerAddress>) => void;
};

function OrderAddressForm({ title, value, onChange }: OrderAddressFormProps) {
  return (
    <fieldset className="address-group">
      <legend>{title}</legend>
      <label>Street address<input value={value.line1} onChange={(event) => onChange({ ...value, line1: event.target.value })} /></label>
      <label>Address line 2<input value={value.line2} onChange={(event) => onChange({ ...value, line2: event.target.value })} /></label>
      <div className="address-fields">
        <label>City<input value={value.city} onChange={(event) => onChange({ ...value, city: event.target.value })} /></label>
        <label>State / region<input value={value.region} onChange={(event) => onChange({ ...value, region: event.target.value })} /></label>
        <label>Postal code<input value={value.postalCode} onChange={(event) => onChange({ ...value, postalCode: event.target.value })} /></label>
        <label>Country<input value={value.country} onChange={(event) => onChange({ ...value, country: event.target.value })} /></label>
      </div>
    </fieldset>
  );
}

function GlassUnitSummary({ unit }: { unit: GlassUnit }) {
  const constructionLabel = unit.construction.toLowerCase().replaceAll("_", " ");
  return (
    <div className="glass-unit-summary">
      <p><strong>{unit.overallWidth} × {unit.overallHeight} in</strong> · {constructionLabel}</p>
      <div className="pane-summary-list">{unit.panes.map((pane) => <div key={pane.id}>
        <strong>Pane {pane.position}: {pane.glassProduct.name}</strong>
        <span>{formatInches(pane.width)} × {formatInches(pane.height)} × {formatInches(pane.thickness)} · {pane.heatTreatment.toLowerCase().replaceAll("_", " ")}{pane.hasHoles ? " · holes" : ""}{pane.flatPolish ? " · flat polish" : ""}{pane.bevel ? " · bevel" : ""}</span>
        <small>{pane.surfaces.map((surface) => `Surface ${pane.position * 2 - (surface.side === "A" ? 1 : 0)} (${surface.side}): ${surface.treatments.map((treatment) => treatment.treatment.name).join(", ") || "no treatments"}`).join(" · ")}</small>
      </div>)}</div>
      {unit.interlayers.length > 0 && <p><strong>Interlayers:</strong> {unit.interlayers.map((layer) => `Gap ${layer.gapNumber}, sheet ${layer.sheetNumber}: ${layer.material.name}, ${layer.color.name}, ${layer.thickness} in${layer.brand ? ` (${layer.brand})` : ""}`).join(" · ")}</p>}
      {unit.cavities.length > 0 && <p><strong>Cavities:</strong> {unit.cavities.map((cavity) => `Gap ${cavity.gapNumber}: ${formatInches(cavity.width)}, ${cavity.spacerType.name} (${cavity.spacerColor.name})${cavity.gasFilled ? ", gas-filled" : ""}`).join(" · ")}</p>}
      {unit.notes && <p><strong>Notes:</strong> {unit.notes}</p>}
    </div>
  );
}

type AddressFormProps = {
  title: string;
  prefix: "billing" | "shipping";
  form: CustomerForm;
  setForm: (form: CustomerForm) => void;
};

function AddressForm({ title, prefix, form, setForm }: AddressFormProps) {
  const field = (name: "Line1" | "Line2" | "City" | "Region" | "PostalCode" | "Country") => `${prefix}${name}` as keyof CustomerForm;
  return (
    <fieldset className="address-group">
      <legend>{title}</legend>
      <label>Street address<input value={form[field("Line1")]} onChange={(event) => setForm({ ...form, [field("Line1")]: event.target.value })} /></label>
      <label>Address line 2<input value={form[field("Line2")]} onChange={(event) => setForm({ ...form, [field("Line2")]: event.target.value })} /></label>
      <div className="address-fields">
        <label>City<input value={form[field("City")]} onChange={(event) => setForm({ ...form, [field("City")]: event.target.value })} /></label>
        <label>State / region<input value={form[field("Region")]} onChange={(event) => setForm({ ...form, [field("Region")]: event.target.value })} /></label>
        <label>Postal code<input value={form[field("PostalCode")]} onChange={(event) => setForm({ ...form, [field("PostalCode")]: event.target.value })} /></label>
        <label>Country<input value={form[field("Country")]} onChange={(event) => setForm({ ...form, [field("Country")]: event.target.value })} /></label>
      </div>
    </fieldset>
  );
}
