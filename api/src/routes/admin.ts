import { FastifyInstance } from "fastify";
import { z } from "zod";

const assignmentSchema = z.object({
  careHomeId: z.string().uuid(),
  role: z.string().min(1)
});

const updateAssignmentsSchema = z.object({
  assignments: z.array(assignmentSchema)
});

const createUserSchema = z.object({
  oid: z.string().min(1),
  upn: z.string().email().optional().nullable(),
  role: z.string().min(1).default("User"),
  homeIds: z.array(z.string().uuid()).default([])
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
      ...(payload.homeIds.length
        ? [
            fastify.prisma.userHomeRole.createMany({
              data: payload.homeIds.map((careHomeId) => ({
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

    await fastify.prisma.$transaction([
      fastify.prisma.userHomeRole.deleteMany({ where: { userId: id } }),
      ...(assignments.length
        ? [fastify.prisma.userHomeRole.createMany({ data: assignments })]
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
