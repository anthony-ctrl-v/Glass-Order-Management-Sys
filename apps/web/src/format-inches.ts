export function formatInches(value: number | string) {
  const inches = Number(value);
  if (!Number.isFinite(inches)) return `${value} in`;
  const sixteenths = Math.round(Math.abs(inches) * 16);
  const whole = Math.floor(sixteenths / 16);
  let numerator = sixteenths % 16;
  let denominator = 16;
  while (numerator > 0 && numerator % 2 === 0) {
    numerator /= 2;
    denominator /= 2;
  }
  const sign = inches < 0 ? "-" : "";
  const fraction = numerator === 0 ? "" : `${whole > 0 ? " " : ""}${numerator}/${denominator}`;
  const formatted = `${sign}${whole > 0 ? whole : ""}${fraction}` || "0";
  return `≈ ${formatted} in`;
}
