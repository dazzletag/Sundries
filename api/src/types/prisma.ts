import type { CareHome, Invoice, InvoiceItem, Resident, Supplier, Visit, VisitItem } from "@prisma/client";

export type VisitItemWithInvoice = VisitItem & { invoiceItem: InvoiceItem | null };
export type VisitWithItems = Visit & {
  supplier: Supplier;
  careHome: CareHome;
  items: VisitItemWithInvoice[];
};

export type ProviderVisit = Visit & {
  careHome: CareHome;
  items: (VisitItem & { resident: Resident })[];
};

export type InvoiceWithRelations = Invoice & {
  supplier: Supplier;
  careHome: CareHome;
  items: InvoiceItem[];
};


