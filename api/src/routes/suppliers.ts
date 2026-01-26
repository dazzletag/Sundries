import { FastifyInstance } from "fastify";
import { z } from "zod";

const serviceTypeEnum = z.enum(["Hairdressing", "Chiropody", "ChiropodyPremium", "Other"]);
const supplierSchema = z.object({
  name: z.string().min(3),
  serviceType: serviceTypeEnum,
  email: z.string().email().optional(),
  phone: z.string().optional(),
  defaultRate: z.number().positive(),
  isActive: z.boolean().default(true)
});

export default async function supplierRoutes(fastify: FastifyInstance) {
  fastify.get("/", { preHandler: fastify.authenticate }, async () => {
    return fastify.prisma.supplier.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
  });

  fastify.post("/", { preHandler: fastify.authenticate }, async (request) => {
    const payload = supplierSchema.parse(request.body);
    return fastify.prisma.supplier.create({ data: payload });
  });
}
