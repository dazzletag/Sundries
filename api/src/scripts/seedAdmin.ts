import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const adminOid = process.env.ADMIN_OID;
const adminUpn = process.env.ADMIN_UPN ?? null;
const homeIds = (process.env.ADMIN_HOME_IDS ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const run = async () => {
  if (!adminOid) {
    throw new Error("ADMIN_OID must be set");
  }

  const user = await prisma.appUser.upsert({
    where: { oid: adminOid },
    create: {
      oid: adminOid,
      upn: adminUpn ?? null,
      displayName: adminUpn ?? null
    },
    update: {
      upn: adminUpn ?? undefined
    }
  });

  const careHomes =
    homeIds.length > 0
      ? await prisma.careHome.findMany({ where: { id: { in: homeIds } } })
      : await prisma.careHome.findMany();

  if (!careHomes.length) {
    throw new Error("No care homes found to assign admin role");
  }

  await prisma.userHomeRole.deleteMany({ where: { userId: user.id } });
  await prisma.userHomeRole.createMany({
    data: careHomes.map((home) => ({
      userId: user.id,
      careHomeId: home.id,
      role: "Admin"
    }))
  });

  console.log(`Seeded admin roles for ${user.oid} on ${careHomes.length} homes.`);
};

run()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
