import { Prisma, type OrderStatus } from "@prisma/client";
import { ConflictError } from "./errors.js";

export const physicalUnitTrackingSelect = {
  orderBy: { unitNumber: "asc" as const },
  select: {
    id: true,
    unitNumber: true,
    identifier: true,
    panes: {
      orderBy: { panePosition: "asc" as const },
      select: { id: true, panePosition: true, identifier: true },
    },
  },
} satisfies Prisma.PhysicalGlassUnitFindManyArgs;

type PaneSpecificationForRelease = {
  id: string;
  position: number;
};

export type OrderItemForRelease = {
  id: string;
  lineNumber: number;
  quantity: number;
  glassUnit: { panes: PaneSpecificationForRelease[] } | null;
};

export type PhysicalUnitSeed = {
  orderItemId: string;
  unitNumber: number;
  identifier: string;
  panes: {
    paneSpecificationId: string;
    panePosition: number;
    identifier: string;
  }[];
};

export function assertOrderCanBeReleased(order: { status: OrderStatus; releasedAt: Date | null }) {
  if (order.releasedAt) {
    throw new ConflictError("This order has already been released.");
  }
  if (order.status === "CANCELLED") {
    throw new ConflictError("Cancelled orders cannot be released.");
  }
  if (order.status !== "OPEN") {
    throw new ConflictError("Only open orders can be released.");
  }
}

export function assertOrderNotReleased(order: { releasedAt: Date | null }) {
  if (order.releasedAt) {
    throw new ConflictError("Released orders cannot be edited.");
  }
}

export function buildPhysicalUnitSeeds(
  orderNumber: number,
  items: OrderItemForRelease[],
): PhysicalUnitSeed[] {
  if (items.length === 0) {
    throw new ConflictError("Orders must have at least one item before release.");
  }

  return items.flatMap((item) => {
    const panes = item.glassUnit?.panes;
    if (!panes || panes.length === 0) {
      throw new ConflictError(`Line ${item.lineNumber} needs a complete glass specification before release.`);
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      throw new ConflictError(`Line ${item.lineNumber} must have a valid quantity before release.`);
    }

    return Array.from({ length: item.quantity }, (_, index) => {
      const unitNumber = index + 1;
      const identifier = `${orderNumber}-${item.lineNumber}-${unitNumber}`;
      return {
        orderItemId: item.id,
        unitNumber,
        identifier,
        panes: panes.map((pane) => ({
          paneSpecificationId: pane.id,
          panePosition: pane.position,
          identifier: `${identifier}-${pane.position}`,
        })),
      };
    });
  });
}
