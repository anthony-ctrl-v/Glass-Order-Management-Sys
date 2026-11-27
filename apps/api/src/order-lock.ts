import { Prisma, type OrderStatus } from "@prisma/client";

type LockedOrder = {
  id: string;
  status: OrderStatus;
  releasedAt: Date | null;
};

export async function lockOrder(
  transaction: Prisma.TransactionClient,
  orderId: string,
): Promise<LockedOrder | null> {
  const rows = await transaction.$queryRaw<LockedOrder[]>(Prisma.sql`
    SELECT "id", "status", "releasedAt"
    FROM "Order"
    WHERE "id" = ${orderId}
    FOR UPDATE
  `);
  return rows[0] ?? null;
}
