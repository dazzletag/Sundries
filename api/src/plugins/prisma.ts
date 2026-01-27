import fp from "fastify-plugin";
import { prisma } from "../lib/prisma";

export default fp(async function prismaPlugin(fastify) {
  fastify.decorate("prisma", prisma);

  fastify.addHook("onClose", async () => {
    await prisma.$disconnect();
  });
});

