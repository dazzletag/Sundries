import type { FastifyReply, FastifyRequest } from "fastify";
import type { PrismaClient } from "@prisma/client";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    httpErrors: {
      badRequest: (message?: string) => Error;
      notFound: (message?: string) => Error;
      unauthorized: (message?: string) => Error;
    };
  }

  interface FastifyRequest {
    auth?: {
      sub: string;
      upn?: string;
      roles: string[];
      tid?: string;
      oid?: string;
      preferred_username?: string;
    };
  }
}
