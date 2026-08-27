// biome-ignore lint/style/noCommonJs: Promptfoo loads custom assertions via CommonJS.
const { parseOutput } = require('../helpers/parse-output.cjs')

// biome-ignore lint/style/noCommonJs: Promptfoo loads custom assertions via CommonJS.
module.exports = function (outputString) {
  const routes = parseOutput(outputString)?.routes
  return (
    Array.isArray(routes) &&
    routes.every((r) => r.places.every((p, i) => p.order === i + 1))
  )
}
