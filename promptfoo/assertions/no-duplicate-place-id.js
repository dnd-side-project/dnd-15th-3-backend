// biome-ignore lint/style/noCommonJs: Promptfoo loads custom assertions via CommonJS.
const { parseOutput } = require('../helpers/parse-output.cjs')

// biome-ignore lint/style/noCommonJs: Promptfoo loads custom assertions via CommonJS.
module.exports = function (outputString) {
  const routes = parseOutput(outputString)?.routes
  return (
    Array.isArray(routes) &&
    routes.every((r) => {
      const ids = r.places.map((p) => p.placeId)
      return new Set(ids).size === ids.length
    })
  )
}
