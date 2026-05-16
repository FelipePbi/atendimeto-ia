export function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

export function phoneMatches(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const left = normalizePhone(a);
  const right = normalizePhone(b);
  return left === right || left.endsWith(right) || right.endsWith(left);
}
