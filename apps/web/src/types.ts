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
  glassUnit: GlassUnit | null;
};

export type GlassCatalogKind =
  | "GLASS_PRODUCT"
  | "SURFACE_TREATMENT"
  | "INTERLAYER_MATERIAL"
  | "INTERLAYER_COLOR"
  | "SPACER_TYPE"
  | "SPACER_COLOR";

export type GlassCatalogEntry = {
  id: string;
  kind: GlassCatalogKind;
  name: string;
  manufacturer: string | null;
  description: string | null;
  hasLowESide: boolean;
  facilityWorkRequired: boolean;
  active: boolean;
};

export type GlassUnit = {
  id: string;
  overallWidth: string;
  overallHeight: string;
  construction: "MONOLITHIC" | "INSULATED" | "LAMINATED" | "LAMINATED_INSULATED";
  notes: string | null;
  panes: {
    id: string;
    position: number;
    glassProductId: string;
    glassProduct: GlassCatalogEntry;
    lowESide: "A" | "B" | null;
    width: string;
    height: string;
    thickness: string;
    heatTreatment: "NONE" | "TEMPERED" | "HEAT_STRENGTHENED";
    hasHoles: boolean;
    flatPolish: boolean;
    bevel: boolean;
    surfaces: {
      id: string;
      side: "A" | "B";
      treatments: { treatmentId: string; treatment: GlassCatalogEntry }[];
    }[];
  }[];
  interlayers: {
    id: string;
    gapNumber: number;
    sheetNumber: number;
    materialId: string;
    colorId: string;
    material: GlassCatalogEntry;
    color: GlassCatalogEntry;
    thickness: string;
    brand: string | null;
  }[];
  cavities: {
    id: string;
    gapNumber: number;
    spacerTypeId: string;
    spacerColorId: string;
    spacerType: GlassCatalogEntry;
    spacerColor: GlassCatalogEntry;
    width: string;
    gasFilled: boolean;
  }[];
};

export type GlassUnitInput = {
  overallWidth: number;
  overallHeight: number;
  construction: GlassUnit["construction"];
  notes: string;
  panes: {
    glassProductId: string;
    width: number;
    height: number;
    thickness: number;
    lowESide: GlassUnit["panes"][number]["lowESide"];
    heatTreatment: GlassUnit["panes"][number]["heatTreatment"];
    hasHoles: boolean;
    flatPolish: boolean;
    bevel: boolean;
    surfaces: { side: "A" | "B"; treatmentIds: string[] }[];
  }[];
  interlayers: {
    gapNumber: number;
    sheetNumber: number;
    materialId: string;
    colorId: string;
    thickness: number;
    brand: string;
  }[];
  cavities: {
    gapNumber: number;
    spacerTypeId: string;
    spacerColorId: string;
    width: number;
    gasFilled: boolean;
  }[];
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
