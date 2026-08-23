export function normalizeQueryRows<T>(result: unknown): T[] {
  if (!Array.isArray(result)) return []
  if (Array.isArray(result[0])) return result[0] as T[]
  return result as T[]
}
