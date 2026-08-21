// biome-ignore lint/style/noCommonJs: Promptfoo loads custom assertions via CommonJS.
const { parseOutput } = require('../helpers/parse-output.cjs')

// biome-ignore lint/style/noCommonJs: Promptfoo loads custom assertions via CommonJS.
module.exports = function (outputString) {
  const routes = parseOutput(outputString)?.routes
  if (!Array.isArray(routes)) return false

  const validStrategies = new Set([
    'distance_minimization',
    'preference_first',
    'balanced',
  ])
  const strategies = routes.map((r) => r.strategy)
  const idsSequential = routes.every((r, i) => r.routeId === i + 1)
  const strategiesValid = routes.every((r) => validStrategies.has(r.strategy))
  return (
    idsSequential &&
    strategiesValid &&
    new Set(strategies).size === strategies.length
  )
}
