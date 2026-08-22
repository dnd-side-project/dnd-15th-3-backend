const DEFAULT_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast'
const DEFAULT_MAX_TOKENS = 2048
const SYSTEM_PROMPT =
  '당신은 모임 방문 코스를 설계하는 AI입니다. 주어진 지시사항을 정확히 따라 코스 JSON만 반환하세요. JSON 이외의 설명이나 마크다운 코드 블록은 절대 포함하지 마세요.'

function stripCodeFence(content) {
  const trimmed = content.trim()
  if (!trimmed.startsWith('```')) return trimmed
  const withoutOpening = trimmed.replace(/^```(?:json)?\s*/i, '')
  return withoutOpening.replace(/```\s*$/, '').trim()
}

function errorMessage(payload) {
  if (!payload || !Array.isArray(payload.errors)) {
    return 'Cloudflare API 응답이 올바르지 않습니다.'
  }

  const messages = payload.errors
    .map((error) => (typeof error?.message === 'string' ? error.message : ''))
    .filter((message) => message.length > 0)

  return messages.length > 0
    ? messages.join('; ')
    : 'Cloudflare API 호출에 실패했습니다.'
}

function parseJson(value) {
  try {
    return JSON.parse(value)
  } catch {
    return undefined
  }
}

function compositionKey(placeIds) {
  return [...placeIds].sort().join(',')
}

function hasDuplicateCompositions(routes) {
  const compositions = new Set()
  for (const route of routes) {
    if (!Array.isArray(route?.places)) return false
    const composition = compositionKey(
      route.places.map((place) => place.placeId),
    )
    if (compositions.has(composition)) return true
    compositions.add(composition)
  }
  return false
}

// route-id-name.js 규칙과 동일하게, 여기서도 접미사(코스)를 뺀 설명 부분만 둔다.
const STRATEGY_LABELS = {
  // biome-ignore lint/style/useNamingConvention: CourseStrategy 값과 동일하게 유지
  distance_minimization: '최단거리',
  // biome-ignore lint/style/useNamingConvention: CourseStrategy 값과 동일하게 유지
  preference_first: '선호도 최우선',
  balanced: '균형 잡힌',
}

function buildServerFallback(input) {
  if (!Array.isArray(input?.strategyDefaults)) return undefined

  const placesById = new Map(
    (input.places ?? []).map((place) => [String(place.id), place]),
  )
  const routes = input.strategyDefaults.map((defaultRoute, routeIndex) => ({
    routeId: routeIndex + 1,
    name: STRATEGY_LABELS[defaultRoute.strategy],
    places: defaultRoute.placeIds.map((placeId, placeIndex) => ({
      placeId: String(placeId),
      order: placeIndex + 1,
      category:
        placesById.get(String(placeId))?.category ??
        input.visitOrder[placeIndex],
    })),
  }))

  return routes.length > 0 ? JSON.stringify({ routes }) : undefined
}

function normalizeDuplicateRoutes(output, context) {
  const parsed = parseJson(output)
  if (!parsed || !Array.isArray(parsed.routes)) return output
  if (!hasDuplicateCompositions(parsed.routes)) return output

  const rawInput = context?.vars?.inputJson
  const input = typeof rawInput === 'string' ? parseJson(rawInput) : rawInput
  return buildServerFallback(input) ?? output
}

module.exports = class CloudflareCourseGenerator {
  constructor(options) {
    this.options = options || {}
  }

  id() {
    return this.options.id || 'cloudflare-course-generator'
  }

  async callApi(prompt, context) {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
    const apiToken = process.env.CLOUDFLARE_API_TOKEN
    const model =
      process.env.CLOUDFLARE_MODEL || this.options.model || DEFAULT_MODEL
    const temperature = Number(process.env.LLM_TEMPERATURE || 0.2)
    const maxTokens = Number(
      process.env.CLOUDFLARE_MAX_TOKENS ||
        process.env.LLM_MAX_TOKENS ||
        this.options.maxTokens ||
        DEFAULT_MAX_TOKENS,
    )

    if (!accountId || !apiToken) {
      return {
        error:
          'CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN must be configured.',
      }
    }

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${model}`,
      {
        headers: {
          // biome-ignore lint/style/useNamingConvention: HTTP 헤더 이름과 동일하게 유지
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify({
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: prompt },
          ],
          ...(Number.isFinite(temperature) ? { temperature } : {}),
          ...(Number.isInteger(maxTokens) && maxTokens > 0
            ? {
                // biome-ignore lint/style/useNamingConvention: Cloudflare API field name.
                max_tokens: maxTokens,
              }
            : {}),
        }),
      },
    )

    let payload
    try {
      payload = await response.json()
    } catch {
      return { error: 'Cloudflare API 응답을 JSON으로 읽을 수 없습니다.' }
    }

    const output = payload?.success && payload.result?.response
    if (!response.ok || typeof output !== 'string') {
      return { error: `Cloudflare LLM 호출 실패: ${errorMessage(payload)}` }
    }

    return {
      output: normalizeDuplicateRoutes(stripCodeFence(output), context),
    }
  }
}
