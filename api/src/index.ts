import Fastify from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import dotenv from "dotenv";
import prismaPlugin from "./plugins/prisma";
import authPlugin from "./plugins/auth";
import authorizationPlugin from "./plugins/authorization";
import registerRoutes from "./routes";

dotenv.config();

const server = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? "info"
  }
});

server.register(cors, { origin: true });
server.register(sensible);
server.register(prismaPlugin);
server.register(authPlugin);
server.register(authorizationPlugin);
server.register(registerRoutes);

export const start = async () => {
  try {
    await server.listen({ port: Number(process.env.PORT ?? 4000), host: "0.0.0.0" });
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
};

if (require.main === module) {
  start();
}

export default server;
