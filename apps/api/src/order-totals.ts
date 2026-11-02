import { Prisma } from "@prisma/client";

export type PricedLine = {
  quantity: number;
  unitPrice: Prisma.Decimal;
};

export function calculateLineTotal(line: PricedLine): Prisma.Decimal {
  return line.unitPrice.mul(line.quantity);
}

export function calculateOrderTotal(lines: PricedLine[]): Prisma.Decimal {
  return lines.reduce(
    (total, line) => total.add(calculateLineTotal(line)),
    new Prisma.Decimal(0),
  );
}
