export function normalizeQueryRows<T>(result: unknown): T[] {
  if (!Array.isArray(result)) return []
  if (Array.isArray(result[0])) return result[0] as T[]
  return result as T[]
}

export function serializeError(error: unknown, maxLength = 4_000): string {
  const message = error instanceof Error ? error.message : String(error)
  return message.slice(0, maxLength)
}
