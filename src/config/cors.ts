export function getCorsOrigins(corsOrigins: string): string[] {
  return corsOrigins
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean)
}
