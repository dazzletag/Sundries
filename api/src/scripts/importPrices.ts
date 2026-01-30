import "dotenv/config";
import path from "node:path";
import xlsx from "xlsx";
import { PrismaClient } from "@prisma/client";

type PriceRow = {
  vendorRef?: string;
  itemDescription?: string;
  price?: number;
  accountCode?: string;
  priceValidFrom?: Date | string | number;
};

const prisma = new PrismaClient();

const normalize = (value?: string) => (value ?? "").trim();

const parseDate = (value?: Date | string | number) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") {
    const excelEpoch = Date.UTC(1899, 11, 30);
    const date = new Date(excelEpoch + value * 86400000);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const main = async () => {
  const args = process.argv.slice(2);
  let fileArg: string | undefined;
  let dryRun = false;

  for (const arg of args) {
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (!fileArg && !arg.startsWith("--")) {
      fileArg = arg;
    }
  }

  const filePath = fileArg
    ? path.resolve(fileArg)
    : path.resolve("..", "DataImport", "prices.xlsx");

  const workbook = xlsx.readFile(filePath, { cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("No sheets found in prices workbook");
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json<PriceRow>(sheet, { defval: "" });

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const missingVendors = new Set<string>();

  let lastVendorRef = "";
  let fallbackAccountCode = 0;

  for (const row of rows) {
    const vendorRef = normalize(row.vendorRef);
    const accountCode = normalize(row.accountCode);
    const resolvedVendorRef = vendorRef || accountCode || lastVendorRef;
    const description = normalize(row.itemDescription);
    const price = row.price;
    const validFrom = parseDate(row.priceValidFrom);

    if (resolvedVendorRef) {
      lastVendorRef = resolvedVendorRef;
    }

    if (!resolvedVendorRef || !description || price === undefined || price === null || Number.isNaN(price)) {
      skipped += 1;
      continue;
    }

    const vendor = await prisma.vendor.findUnique({ where: { accountRef: resolvedVendorRef } });
    if (!vendor) {
      missingVendors.add(resolvedVendorRef);
      skipped += 1;
      continue;
    }
    if (!vendorRef && accountCode) {
      fallbackAccountCode += 1;
    }

    const existing = await prisma.priceItem.findFirst({
      where: {
        vendorId: vendor.id,
        description,
        validFrom: validFrom ?? null
      }
    });

    if (dryRun) {
      if (existing) {
        updated += 1;
      } else {
        created += 1;
      }
      continue;
    }

    if (existing) {
      await prisma.priceItem.update({
        where: { id: existing.id },
        data: {
          price,
          validFrom,
          isActive: true
        }
      });
      updated += 1;
    } else {
      await prisma.priceItem.create({
        data: {
          vendorId: vendor.id,
          description,
          price,
          validFrom,
          isActive: true
        }
      });
      created += 1;
    }
  }

  console.log(
    `Prices import complete. created=${created}, updated=${updated}, skipped=${skipped}, missingVendors=${missingVendors.size}, accountCodeFallback=${fallbackAccountCode}`
  );
  if (missingVendors.size > 0) {
    console.log(`Missing vendorRef values: ${Array.from(missingVendors).sort().join(", ")}`);
  }
};

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
