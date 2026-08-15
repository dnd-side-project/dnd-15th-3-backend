type CorsOrigin = string | RegExp

const WILDCARD_SUBDOMAIN_PATTERN = /^(https?):\/\/\*\.(.+)$/

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function parseCorsOrigin(origin: string): CorsOrigin {
  const wildcardMatch = origin.match(WILDCARD_SUBDOMAIN_PATTERN)
  if (!wildcardMatch) return origin

  const [, protocol, hostname] = wildcardMatch
  return new RegExp(`^${protocol}:\\/\\/[^./:]+\\.${escapeRegExp(hostname)}$`)
}

export function getCorsOrigins(corsOrigins: string): CorsOrigin[] {
  return corsOrigins
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean)
    .map(parseCorsOrigin)
}
