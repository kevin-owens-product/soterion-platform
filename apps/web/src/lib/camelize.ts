/**
 * Recursively converts all object keys from snake_case to camelCase.
 * Leaves values untouched (only keys are transformed).
 * Handles arrays, nested objects, and null/undefined safely.
 */
export function camelizeKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(camelizeKeys);
  }
  if (obj !== null && typeof obj === "object" && !(obj instanceof Date)) {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([key, val]) => [
        key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()),
        camelizeKeys(val),
      ]),
    );
  }
  return obj;
}
