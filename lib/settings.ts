import { prisma } from "@/lib/db";

const DEFAULT_FEE = Number(process.env.PLATFORM_FEE_PERCENT ?? "3");
const PLATFORM_NAME = process.env.PLATFORM_NAME ?? "ShramSetu";

/** Returns the singleton Setting row, creating it on first access. */
export async function getSettings() {
  const existing = await prisma.setting.findUnique({ where: { id: 1 } });
  if (existing) return existing;
  return prisma.setting.create({
    data: {
      id: 1,
      platformName: PLATFORM_NAME,
      platformFeePercent: Number.isFinite(DEFAULT_FEE) ? DEFAULT_FEE : 3,
      paymentsEnabled: false,
    },
  });
}
