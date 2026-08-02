const STRATEGIES = ['distance_minimization', 'preference_first', 'balanced']

const {
  sequenceKey,
} = /* biome-ignore lint/style/noCommonJs: Promptfoo loads custom assertions via CommonJS. */ require('../helpers/course-candidates.cjs')
const { parseOutput } = require('../helpers/parse-output.cjs')

function parseInput(context) {
  const rawInput = context?.vars?.inputJson
  return typeof rawInput === 'string' ? JSON.parse(rawInput) : rawInput
}

// biome-ignore lint/style/noCommonJs: Promptfoo loads custom assertions via CommonJS.
module.exports = function (outputString, context) {
  const input = parseInput(context)
  const routes = parseOutput(outputString)?.routes
  if (
    !Array.isArray(routes) ||
    !Array.isArray(input?.routeCandidates) ||
    !input.selectionPools
  ) {
    return false
  }

  const usedStrategies = new Set()
  const outputSequences = routes.map((route) =>
    sequenceKey(route.places.map((place) => place.placeId)),
  )

  return routes.every((route, routeIndex) => {
    if (!STRATEGIES.includes(route.strategy)) return false
    if (usedStrategies.has(route.strategy)) return false
    usedStrategies.add(route.strategy)

    const pool = input.selectionPools[route.strategy]
    const inPool = pool.some(
      (candidate) =>
        sequenceKey(candidate.placeIds) === outputSequences[routeIndex],
    )

    return inPool
  })
}
