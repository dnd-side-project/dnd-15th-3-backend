// biome-ignore lint/style/noCommonJs: Promptfoo loads custom assertions via CommonJS.
const { parseOutput } = require('../helpers/parse-output.cjs')

// biome-ignore lint/style/noCommonJs: Promptfoo loads custom assertions via CommonJS.
module.exports = function (outputString) {
  const routes = parseOutput(outputString)?.routes
  if (!Array.isArray(routes)) return false

  return routes.every((r, i) => r.routeId === i + 1)
}
