import PDFDocument from "pdfkit";
import type { CareHome, Invoice, InvoiceItem, Supplier } from "@prisma/client";

export const createInvoicePdf = async (params: {
  invoice: Invoice;
  careHome: CareHome;
  supplier: Supplier;
  items: InvoiceItem[];
}) => {
  const { invoice, careHome, supplier, items } = params;
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  doc.font("Helvetica");

  doc.fontSize(18).text("Sundries Services Ltd", { align: "left" });
  doc.moveDown(0.5);
  doc.fontSize(12).text(`Invoice No: ${invoice.invoiceNo}`);
  doc.text(`Supplier: ${supplier.name}`);
  doc.text(`Care Home: ${careHome.name}`);
  doc.text(`Period: ${invoice.periodStart.toISOString().slice(0, 10)} → ${invoice.periodEnd.toISOString().slice(0, 10)}`);
  if (invoice.issuedAt) {
    doc.text(`Issued: ${invoice.issuedAt.toISOString().slice(0, 10)}`);
  }
  doc.moveDown(1);

  doc.fontSize(14).text("Items", { underline: true });
  doc.moveDown(0.25);

  const tableTop = doc.y;
  doc.fontSize(10);
  doc.text("Description", 40, tableTop);
  doc.text("Qty", 220, tableTop);
  doc.text("Unit", 260, tableTop);
  doc.text("VAT%", 320, tableTop);
  doc.text("Line Total", 380, tableTop);
  doc.moveDown(0.5);

  let y = doc.y;
  for (const item of items) {
    doc.text(item.description, 40, y, { width: 180 });
    doc.text(String(item.qty), 220, y);
    doc.text(item.unitPrice.toFixed(2), 260, y);
    doc.text(item.vatRate.toFixed(2), 320, y);
    doc.text(item.lineTotal.toFixed(2), 380, y);
    y += 16;
    if (y > 720) {
      doc.addPage();
      y = 40;
    }
  }

  doc.moveDown(1);
  doc.fontSize(12).text(`Subtotal: £${invoice.subtotal.toFixed(2)}`);
  doc.text(`VAT: £${invoice.vatTotal.toFixed(2)}`);
  doc.text(`Total: £${invoice.total.toFixed(2)}`);

  doc.end();

  const buffers: Buffer[] = [];
  return new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);
  });
};
