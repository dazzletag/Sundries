import { FastifyInstance } from "fastify";
import { z } from "zod";

const nonEmptyString = z.string().trim().min(1);

const assignmentSchema = z.object({
  careHomeId: nonEmptyString,
  role: nonEmptyString
});

const updateAssignmentsSchema = z.object({
  assignments: z.array(assignmentSchema)
});

const createUserSchema = z.object({
  oid: nonEmptyString,
  upn: z.string().email().optional().nullable(),
  role: nonEmptyString.default("User"),
  homeIds: z.array(nonEmptyString).default([])
});

export default async function adminRoutes(fastify: FastifyInstance) {
  const adminGuard = { preHandler: [fastify.authenticate, fastify.requireAdmin] };

  fastify.get("/users", adminGuard, async () => {
    return fastify.prisma.appUser.findMany({
      orderBy: { upn: "asc" },
      include: {
        homeRoles: {
          include: { careHome: true },
          orderBy: { careHomeId: "asc" }
        }
      }
    });
  });

  fastify.post("/users", adminGuard, async (request) => {
    const payload = createUserSchema.parse(request.body);
    const uniqueHomeIds = [...new Set(payload.homeIds)];
    if (uniqueHomeIds.length) {
      const homeCount = await fastify.prisma.careHome.count({
        where: { id: { in: uniqueHomeIds } }
      });
      if (homeCount !== uniqueHomeIds.length) {
        throw fastify.httpErrors.badRequest("One or more care homes are invalid");
      }
    }

    const user = await fastify.prisma.appUser.upsert({
      where: { oid: payload.oid },
      create: {
        oid: payload.oid,
        upn: payload.upn ?? null,
        displayName: payload.upn ?? null
      },
      update: {
        upn: payload.upn ?? undefined
      }
    });

    await fastify.prisma.$transaction([
      fastify.prisma.userHomeRole.deleteMany({ where: { userId: user.id } }),
      ...(uniqueHomeIds.length
        ? [
            fastify.prisma.userHomeRole.createMany({
              data: uniqueHomeIds.map((careHomeId) => ({
                userId: user.id,
                careHomeId,
                role: payload.role
              }))
            })
          ]
        : [])
    ]);

    return fastify.prisma.appUser.findUnique({
      where: { id: user.id },
      include: {
        homeRoles: {
          include: { careHome: true },
          orderBy: { careHomeId: "asc" }
        }
      }
    });
  });

  fastify.patch("/users/:id/homes", adminGuard, async (request) => {
    const { id } = request.params as { id: string };
    const payload = updateAssignmentsSchema.parse(request.body);

    const user = await fastify.prisma.appUser.findUnique({ where: { id } });
    if (!user) {
      throw fastify.httpErrors.notFound("User not found");
    }

    const assignments = payload.assignments.map((assignment) => ({
      userId: id,
      careHomeId: assignment.careHomeId,
      role: assignment.role
    }));

    const assignmentMap = new Map<string, string>();
    assignments.forEach((assignment) => {
      assignmentMap.set(assignment.careHomeId, assignment.role);
    });

    const uniqueAssignmentHomeIds = Array.from(assignmentMap.keys());
    if (uniqueAssignmentHomeIds.length) {
      const homeCount = await fastify.prisma.careHome.count({
        where: { id: { in: uniqueAssignmentHomeIds } }
      });
      if (homeCount !== uniqueAssignmentHomeIds.length) {
        throw fastify.httpErrors.badRequest("One or more care homes are invalid");
      }
    }

    const uniqueAssignments = Array.from(assignmentMap.entries()).map(([careHomeId, role]) => ({
      userId: id,
      careHomeId,
      role
    }));

    await fastify.prisma.$transaction([
      fastify.prisma.userHomeRole.deleteMany({ where: { userId: id } }),
      ...(uniqueAssignments.length
        ? [fastify.prisma.userHomeRole.createMany({ data: uniqueAssignments })]
        : [])
    ]);

    return fastify.prisma.userHomeRole.findMany({
      where: { userId: id },
      include: { careHome: true },
      orderBy: { careHomeId: "asc" }
    });
  });

  fastify.get("/homes", adminGuard, async () => {
    return fastify.prisma.careHome.findMany({
      orderBy: { name: "asc" }
    });
  });
}
