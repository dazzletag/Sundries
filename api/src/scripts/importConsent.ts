import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import xlsx from "xlsx";
import { PrismaClient } from "@prisma/client";

type ConsentRow = {
  name?: string;
  accountCode?: string;
  fullName?: string;
  SundryConsentReceived?: boolean;
  NewspapersConsent?: boolean;
  ChiropodyConsent?: boolean;
  HairdressersConsent?: boolean;
  ShopConsent?: boolean;
  OtherConsent?: boolean;
  RoomNumber?: string;
  "Hairdressing Note"?: string;
  "Chiropody Note"?: string;
  "Shop Note"?: string;
  Created?: Date | string;
  Modified?: Date | string;
  "CurrentResident?"?: boolean | string;
  residentId?: string;
};

const prisma = new PrismaClient();

const askYesNo = async (rl: readline.Interface, prompt: string) => {
  const answer = (await rl.question(`${prompt} (y/n): `)).trim().toLowerCase();
  return answer === "y" || answer === "yes";
};

const parseDate = (value?: Date | string) => {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const normalize = (value?: string) => (value ?? "").trim();

const parseCurrentResident = (value?: boolean | string) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const trimmed = value.trim().toLowerCase();
    if (trimmed === "") return undefined;
    if (trimmed === "yes" || trimmed === "true" || trimmed === "1") return true;
    if (trimmed === "no" || trimmed === "false" || trimmed === "0") return false;
  }
  return undefined;
};

type ConflictRecord = {
  key: string;
  careHomeName: string;
  fullName: string;
  existingAccountCode: string | null;
  newAccountCode: string;
};

const main = async () => {
  const args = process.argv.slice(2);
  let fileArg: string | undefined;
  let answersPath: string | undefined;
  let collectConflicts = false;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--answers") {
      answersPath = args[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--collect-conflicts") {
      collectConflicts = true;
      continue;
    }
    if (!fileArg && !arg.startsWith("--")) {
      fileArg = arg;
    }
  }

  const filePath = fileArg
    ? path.resolve(fileArg)
    : path.resolve("..", "DataImport", "consentTable.xlsx");

  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("No sheets found in consent workbook");
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json<ConsentRow>(sheet, { defval: "" });

  const careHomes = await prisma.careHome.findMany({ select: { id: true, name: true } });
  const careHomeByName = new Map(careHomes.map((home) => [home.name.toLowerCase(), home]));

  const rl = readline.createInterface({ input, output });
  const resolvedNameConflicts = new Map<string, boolean>();
  const answers = answersPath
    ? (JSON.parse(fs.readFileSync(path.resolve(answersPath), "utf8")) as Record<string, boolean>)
    : {};
  const useAnswersOnly = Boolean(answersPath);
  const conflicts: ConflictRecord[] = [];
  const allowWrites = !collectConflicts;

  let created = 0;
  let updated = 0;
  let skipped = 0;

  try {
    for (const row of rows) {
      const careHomeName = normalize(row.name);
      const accountCode = normalize(row.accountCode);
      const fullName = normalize(row.fullName);

      if (!careHomeName || !accountCode) {
        skipped += 1;
        continue;
      }

      const careHome = careHomeByName.get(careHomeName.toLowerCase());
      if (!careHome) {
        console.warn(`Skipping ${fullName || accountCode}: unknown care home "${careHomeName}"`);
        skipped += 1;
        continue;
      }

      const resident = await prisma.careHqResident.findFirst({
        where: { accountCode }
      });

      if (resident) {
        const existingByResident = await prisma.residentConsent.findFirst({
          where: { careHqResidentId: resident.id }
        });

        if (!existingByResident && fullName.length > 0) {
          const possibleConflict = await prisma.residentConsent.findFirst({
            where: {
              careHomeId: careHome.id,
              fullName,
              accountCode: { not: accountCode }
            }
          });

          if (possibleConflict) {
            const conflictKey = `${careHome.id}:${fullName}:${accountCode}`;
            let sameResident = resolvedNameConflicts.get(conflictKey);
            if (sameResident === undefined) {
              const prompt =
                `Resident name conflict: "${fullName}" in ${careHomeName}. ` +
                `Existing accountCode=${possibleConflict.accountCode ?? "none"}, new accountCode=${accountCode}. ` +
                `Are these the same person?`;
              sameResident = answers[conflictKey];
              if (sameResident === undefined && collectConflicts) {
                conflicts.push({
                  key: conflictKey,
                  careHomeName,
                  fullName,
                  existingAccountCode: possibleConflict.accountCode ?? null,
                  newAccountCode: accountCode
                });
                skipped += 1;
                continue;
              }
              if (sameResident === undefined && useAnswersOnly) {
                console.warn(`Missing answer for conflict ${conflictKey}, skipping row.`);
                skipped += 1;
                continue;
              }
              if (sameResident === undefined) {
                sameResident = await askYesNo(rl, prompt);
              }
              resolvedNameConflicts.set(conflictKey, sameResident);
            }

            if (sameResident) {
              if (!allowWrites) {
                updated += 1;
                continue;
              }
              await prisma.residentConsent.update({
                where: { id: possibleConflict.id },
                data: {
                  careHomeId: careHome.id,
                  accountCode,
                  careHqResidentId: resident.id,
                  roomNumber: row.RoomNumber ? String(row.RoomNumber) : possibleConflict.roomNumber,
                  fullName: fullName || possibleConflict.fullName,
                  serviceUserId: row.residentId ? String(row.residentId) : possibleConflict.serviceUserId,
                  sundryConsentReceived: Boolean(row.SundryConsentReceived),
                  newspapersConsent: Boolean(row.NewspapersConsent),
                  chiropodyConsent: Boolean(row.ChiropodyConsent),
                  hairdressersConsent: Boolean(row.HairdressersConsent),
                  shopConsent: Boolean(row.ShopConsent),
                  otherConsent: Boolean(row.OtherConsent),
                  chiropodyNote: row["Chiropody Note"] ? String(row["Chiropody Note"]) : null,
                  shopNote: row["Shop Note"] ? String(row["Shop Note"]) : null,
                  comments: row["Hairdressing Note"] ? String(row["Hairdressing Note"]) : null,
                  currentResident: row["CurrentResident?"] === "" ? possibleConflict.currentResident : Boolean(row["CurrentResident?"]),
                  createdAt: parseDate(row.Created) ?? possibleConflict.createdAt,
                  updatedAt: parseDate(row.Modified) ?? new Date()
                }
              });
              updated += 1;
              continue;
            }
          }
        }

        if (!allowWrites) {
          updated += 1;
          continue;
        }

        if (!existingByResident) {
          const currentResident = parseCurrentResident(row["CurrentResident?"]);
          await prisma.residentConsent.create({
            data: {
              careHomeId: careHome.id,
              careHqResidentId: resident.id,
              roomNumber: row.RoomNumber ? String(row.RoomNumber) : null,
              fullName: fullName || null,
              accountCode,
              serviceUserId: row.residentId ? String(row.residentId) : null,
              sundryConsentReceived: Boolean(row.SundryConsentReceived),
              newspapersConsent: Boolean(row.NewspapersConsent),
              chiropodyConsent: Boolean(row.ChiropodyConsent),
              hairdressersConsent: Boolean(row.HairdressersConsent),
              shopConsent: Boolean(row.ShopConsent),
              otherConsent: Boolean(row.OtherConsent),
              chiropodyNote: row["Chiropody Note"] ? String(row["Chiropody Note"]) : null,
              shopNote: row["Shop Note"] ? String(row["Shop Note"]) : null,
              comments: row["Hairdressing Note"] ? String(row["Hairdressing Note"]) : null,
              currentResident: currentResident ?? true,
              createdAt: parseDate(row.Created) ?? new Date(),
              updatedAt: parseDate(row.Modified) ?? new Date()
            }
          });
          created += 1;
        } else {
          const currentResident = parseCurrentResident(row["CurrentResident?"]);
          await prisma.residentConsent.update({
            where: { id: existingByResident.id },
            data: {
              careHomeId: careHome.id,
              roomNumber: row.RoomNumber ? String(row.RoomNumber) : existingByResident.roomNumber,
              fullName: fullName ? fullName : existingByResident.fullName,
              accountCode,
              serviceUserId: row.residentId ? String(row.residentId) : existingByResident.serviceUserId,
              sundryConsentReceived: Boolean(row.SundryConsentReceived),
              newspapersConsent: Boolean(row.NewspapersConsent),
              chiropodyConsent: Boolean(row.ChiropodyConsent),
              hairdressersConsent: Boolean(row.HairdressersConsent),
              shopConsent: Boolean(row.ShopConsent),
              otherConsent: Boolean(row.OtherConsent),
              chiropodyNote: row["Chiropody Note"] ? String(row["Chiropody Note"]) : null,
              shopNote: row["Shop Note"] ? String(row["Shop Note"]) : null,
              comments: row["Hairdressing Note"] ? String(row["Hairdressing Note"]) : null,
              currentResident: currentResident ?? existingByResident.currentResident,
              createdAt: parseDate(row.Created) ?? existingByResident.createdAt,
              updatedAt: parseDate(row.Modified) ?? new Date()
            }
          });
          updated += 1;
        }
        continue;
      }

      const existingByAccount = await prisma.residentConsent.findFirst({
        where: { accountCode }
      });

      if (existingByAccount) {
        if (!allowWrites) {
          updated += 1;
          continue;
        }
        const currentResident = parseCurrentResident(row["CurrentResident?"]);
        await prisma.residentConsent.update({
          where: { id: existingByAccount.id },
          data: {
            careHomeId: careHome.id,
            roomNumber: row.RoomNumber ? String(row.RoomNumber) : existingByAccount.roomNumber,
            fullName: fullName || existingByAccount.fullName,
            accountCode,
            serviceUserId: row.residentId ? String(row.residentId) : existingByAccount.serviceUserId,
            sundryConsentReceived: Boolean(row.SundryConsentReceived),
            newspapersConsent: Boolean(row.NewspapersConsent),
            chiropodyConsent: Boolean(row.ChiropodyConsent),
            hairdressersConsent: Boolean(row.HairdressersConsent),
            shopConsent: Boolean(row.ShopConsent),
            otherConsent: Boolean(row.OtherConsent),
            chiropodyNote: row["Chiropody Note"] ? String(row["Chiropody Note"]) : null,
            shopNote: row["Shop Note"] ? String(row["Shop Note"]) : null,
            comments: row["Hairdressing Note"] ? String(row["Hairdressing Note"]) : null,
            currentResident: currentResident ?? existingByAccount.currentResident,
            createdAt: parseDate(row.Created) ?? existingByAccount.createdAt,
            updatedAt: parseDate(row.Modified) ?? new Date()
          }
        });
        updated += 1;
        continue;
      }

      if (fullName.length > 0) {
        const possibleConflict = await prisma.residentConsent.findFirst({
          where: {
            careHomeId: careHome.id,
            fullName,
            accountCode: { not: accountCode }
          }
        });

        if (possibleConflict) {
          const conflictKey = `${careHome.id}:${fullName}:${accountCode}`;
          let sameResident = resolvedNameConflicts.get(conflictKey);
          if (sameResident === undefined) {
            const prompt =
              `Resident name conflict: "${fullName}" in ${careHomeName}. ` +
              `Existing accountCode=${possibleConflict.accountCode ?? "none"}, new accountCode=${accountCode}. ` +
              `Are these the same person?`;
            sameResident = answers[conflictKey];
            if (sameResident === undefined && collectConflicts) {
              conflicts.push({
                key: conflictKey,
                careHomeName,
                fullName,
                existingAccountCode: possibleConflict.accountCode ?? null,
                newAccountCode: accountCode
              });
              skipped += 1;
              continue;
            }
            if (sameResident === undefined && useAnswersOnly) {
              console.warn(`Missing answer for conflict ${conflictKey}, skipping row.`);
              skipped += 1;
              continue;
            }
            if (sameResident === undefined) {
              sameResident = await askYesNo(rl, prompt);
            }
            resolvedNameConflicts.set(conflictKey, sameResident);
          }

          if (sameResident) {
            if (!allowWrites) {
              updated += 1;
              continue;
            }
            const currentResident = parseCurrentResident(row["CurrentResident?"]);
            await prisma.residentConsent.update({
              where: { id: possibleConflict.id },
              data: {
                careHomeId: careHome.id,
                accountCode,
                roomNumber: row.RoomNumber ? String(row.RoomNumber) : possibleConflict.roomNumber,
                fullName: fullName || possibleConflict.fullName,
                serviceUserId: row.residentId ? String(row.residentId) : possibleConflict.serviceUserId,
                sundryConsentReceived: Boolean(row.SundryConsentReceived),
                newspapersConsent: Boolean(row.NewspapersConsent),
                chiropodyConsent: Boolean(row.ChiropodyConsent),
                hairdressersConsent: Boolean(row.HairdressersConsent),
                shopConsent: Boolean(row.ShopConsent),
                otherConsent: Boolean(row.OtherConsent),
                chiropodyNote: row["Chiropody Note"] ? String(row["Chiropody Note"]) : null,
                shopNote: row["Shop Note"] ? String(row["Shop Note"]) : null,
                comments: row["Hairdressing Note"] ? String(row["Hairdressing Note"]) : null,
                currentResident: currentResident ?? possibleConflict.currentResident,
                createdAt: parseDate(row.Created) ?? possibleConflict.createdAt,
                updatedAt: parseDate(row.Modified) ?? new Date()
              }
            });
            updated += 1;
            continue;
          }
        }
      }

      if (!allowWrites) {
        created += 1;
        continue;
      }

      const currentResident = parseCurrentResident(row["CurrentResident?"]);
      await prisma.residentConsent.create({
        data: {
          careHomeId: careHome.id,
          careHqResidentId: null,
          roomNumber: row.RoomNumber ? String(row.RoomNumber) : null,
          fullName: fullName || null,
          accountCode,
          serviceUserId: row.residentId ? String(row.residentId) : null,
          sundryConsentReceived: Boolean(row.SundryConsentReceived),
          newspapersConsent: Boolean(row.NewspapersConsent),
          chiropodyConsent: Boolean(row.ChiropodyConsent),
          hairdressersConsent: Boolean(row.HairdressersConsent),
          shopConsent: Boolean(row.ShopConsent),
          otherConsent: Boolean(row.OtherConsent),
          chiropodyNote: row["Chiropody Note"] ? String(row["Chiropody Note"]) : null,
          shopNote: row["Shop Note"] ? String(row["Shop Note"]) : null,
          comments: row["Hairdressing Note"] ? String(row["Hairdressing Note"]) : null,
          currentResident: currentResident ?? true,
          createdAt: parseDate(row.Created) ?? new Date(),
          updatedAt: parseDate(row.Modified) ?? new Date()
        }
      });
      created += 1;
    }
  } finally {
    rl.close();
  }

  if (collectConflicts) {
    console.log(`Consent conflict scan complete. conflicts=${conflicts.length}, skipped=${skipped}`);
    conflicts.forEach((conflict) => {
      console.log(JSON.stringify(conflict));
    });
    return;
  }

  console.log(`Consent import complete. created=${created}, updated=${updated}, skipped=${skipped}`);
};

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
