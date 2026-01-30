import type { FastifyReply, FastifyRequest } from "fastify";
import type { AppUser, CareHome, PrismaClient, UserHomeRole } from "@prisma/client";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    ensureUser: (request: FastifyRequest) => Promise<AppUser>;
    getUserContext: (request: FastifyRequest) => Promise<{
      user: AppUser;
      roles: (UserHomeRole & { careHome: CareHome })[];
      isAdmin: boolean;
      careHomeIds: string[];
      careHomeNames: string[];
    }>;
    requireAdmin: (request: FastifyRequest) => Promise<void>;
    requireHomeAccess: (request: FastifyRequest, careHomeId: string) => Promise<void>;
    httpErrors: {
      badRequest: (message?: string) => Error;
      notFound: (message?: string) => Error;
      unauthorized: (message?: string) => Error;
      forbidden: (message?: string) => Error;
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
