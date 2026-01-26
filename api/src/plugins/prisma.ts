import fp from "fastify-plugin";
import { PrismaClient } from "@prisma/client";

export default fp(async function prismaPlugin(fastify) {
  const prisma = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "info"] : ["error"]
  });

  fastify.decorate("prisma", prisma);

  fastify.addHook("onClose", async () => {
    await prisma.$disconnect();
  });
});
