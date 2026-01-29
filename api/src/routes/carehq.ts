import { FastifyInstance } from "fastify";
import { fetchCareHqResidents } from "../services/carehq";

export default async function careHqRoutes(fastify: FastifyInstance) {
  fastify.get("/residents", { preHandler: fastify.authenticate }, async () => {
    return fastify.prisma.careHqResident.findMany({
      orderBy: [{ careHomeName: "asc" }, { roomNumber: "asc" }]
    });
  });

  fastify.post("/residents/sync", { preHandler: fastify.authenticate }, async (request) => {
    const residents = await fetchCareHqResidents();

    const now = new Date();
    const upserts = [];

    for (const resident of residents) {
      upserts.push(
        fastify.prisma.careHqResident.upsert({
          where: { careHqRoomId: resident.careHqRoomId },
          create: {
            careHomeName: resident.careHomeName,
            careHqLocationId: resident.careHqLocationId,
            careHqRoomId: resident.careHqRoomId,
            roomNumber: resident.roomNumber,
            fullName: resident.fullName,
            accountCode: resident.accountCode,
            serviceUserId: resident.serviceUserId,
            isVacant: resident.isVacant,
            lastSyncedAt: now
          },
          update: {
            careHomeName: resident.careHomeName,
            careHqLocationId: resident.careHqLocationId,
            roomNumber: resident.roomNumber,
            fullName: resident.fullName,
            accountCode: resident.accountCode,
            serviceUserId: resident.serviceUserId,
            isVacant: resident.isVacant,
            lastSyncedAt: now
          }
        })
      );
    }

    if (upserts.length) {
      await fastify.prisma.$transaction(upserts);
    }

    return {
      synced: upserts.length,
      total: residents.length,
      lastSyncedAt: now.toISOString()
    };
  });
}
