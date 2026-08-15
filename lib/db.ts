import { PrismaClient } from "@prisma/client";

// نمنع إنشاء اتصال جديد بقاعدة البيانات مع كل Hot Reload في وضع التطوير.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
