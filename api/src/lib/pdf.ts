import PDFDocument from "pdfkit";
import type { CareHome, Vendor } from "@prisma/client";

export const createInvoicePdf = async (params: {
  invoiceNo: string;
  vendor: Vendor;
  careHome: CareHome;
  issuedAt: Date;
  items: Array<{
    residentName: string;
    description: string;
    price: number;
  }>;
}) => {
  const { invoiceNo, vendor, careHome, issuedAt, items } = params;
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  doc.font("Helvetica");

  doc.fontSize(18).text("Sundries Services Ltd", { align: "left" });
  doc.moveDown(0.5);
  doc.fontSize(12).text(`Invoice No: ${invoiceNo}`);
  doc.text(`Supplier: ${vendor.name} (${vendor.accountRef})`);
  [vendor.address1, vendor.address2, vendor.address3, vendor.address4, vendor.address5]
    .filter(Boolean)
    .forEach((line) => doc.text(String(line)));
  doc.text(`Care Home: ${careHome.name}`);
  doc.text(`Issued: ${issuedAt.toISOString().slice(0, 10)}`);
  doc.moveDown(1);

  doc.fontSize(14).text("Items", { underline: true });
  doc.moveDown(0.25);

  const tableTop = doc.y;
  doc.fontSize(10);
  doc.text("Resident", 40, tableTop);
  doc.text("Description", 200, tableTop);
  doc.text("Price", 450, tableTop);
  doc.moveDown(0.5);

  let y = doc.y;
  let total = 0;
  for (const item of items) {
    doc.text(item.residentName, 40, y, { width: 150 });
    doc.text(item.description, 200, y, { width: 220 });
    doc.text(item.price.toFixed(2), 450, y, { width: 80 });
    total += item.price;
    y += 16;
    if (y > 720) {
      doc.addPage();
      y = 40;
    }
  }

  doc.moveDown(1);
  doc.fontSize(12).text(`Total: £${total.toFixed(2)}`);
  doc.moveDown(1);
  doc.fontSize(10).text("Supplier signature: _____________________________");

  doc.end();

  const buffers: Buffer[] = [];
  return new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);
  });
};

export const createSalesInvoicePdf = async (params: {
  vendorName: string;
  vendorAccountRef: string;
  vendorAddressLines?: Array<string | null | undefined>;
  careHomeName: string;
  invoiceNo: string;
  issuedAt: Date;
  items: Array<{
    residentName: string;
    description: string;
    price: number;
  }>;
}) => {
  const { vendorName, vendorAccountRef, vendorAddressLines, careHomeName, invoiceNo, issuedAt, items } = params;
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  doc.font("Helvetica");

  doc.fontSize(18).text("Sundries Services Ltd", { align: "left" });
  doc.moveDown(0.5);
  doc.fontSize(12).text(`Invoice No: ${invoiceNo}`);
  doc.text(`Supplier: ${vendorName} (${vendorAccountRef})`);
  if (vendorAddressLines && vendorAddressLines.filter(Boolean).length > 0) {
    vendorAddressLines.filter(Boolean).forEach((line) => {
      doc.text(String(line));
    });
  }
  doc.text(`Care Home: ${careHomeName}`);
  doc.text(`Issued: ${issuedAt.toISOString().slice(0, 10)}`);
  doc.moveDown(1);

  doc.fontSize(12).text("Items", { underline: true });
  doc.moveDown(0.5);

  const tableTop = doc.y;
  doc.fontSize(10);
  doc.text("Resident", 40, tableTop);
  doc.text("Description", 200, tableTop);
  doc.text("Price", 450, tableTop);
  doc.moveDown(0.5);

  let y = doc.y;
  let total = 0;
  for (const item of items) {
    doc.text(item.residentName, 40, y, { width: 150 });
    doc.text(item.description, 200, y, { width: 220 });
    doc.text(item.price.toFixed(2), 450, y, { width: 80 });
    total += item.price;
    y += 16;
    if (y > 720) {
      doc.addPage();
      y = 40;
    }
  }

  doc.moveDown(1);
  doc.fontSize(12).text(`Total: £${total.toFixed(2)}`);
  doc.moveDown(1);
  doc.fontSize(10).text("Supplier signature: _____________________________");

  doc.end();

  const buffers: Buffer[] = [];
  return new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);
  });
};
