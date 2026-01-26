import { PrismaClient } from "@prisma/client";

const slugifySupplier = (name: string) => {
  const cleaned = name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
  return cleaned || "SUP";
};

export const generateInvoiceNumber = async (
  prisma: PrismaClient,
  supplierId: string,
  periodStart: Date
) => {
  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId }
  });
  const month = periodStart.toISOString().slice(0, 7).replace("-", "");
  const prefix = supplier ? slugifySupplier(supplier.name) : supplierId.slice(0, 4).toUpperCase();
  const count = await prisma.invoice.count({
    where: {
      supplierId,
      invoiceNo: { startsWith: `${prefix}-${month}` }
    }
  });
  return `${prefix}-${month}-${String(count + 1).padStart(4, "0")}`;
};

export const computeTotals = (items: Array<{ qty: number; unitPrice: number; vatRate: number }>) => {
  let subtotal = 0;
  let vatTotal = 0;
  for (const item of items) {
    const line = item.qty * item.unitPrice;
    const vat = line * (item.vatRate / 100);
    subtotal += line;
    vatTotal += vat;
  }
  return {
    subtotal,
    vatTotal,
    total: subtotal + vatTotal
  };
};

