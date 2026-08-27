// biome-ignore lint/style/noCommonJs: Promptfoo loads custom assertions via CommonJS.
const { parseOutput } = require('../helpers/parse-output.cjs')

// biome-ignore lint/style/noCommonJs: Promptfoo loads custom assertions via CommonJS.
module.exports = function (outputString) {
  const routes = parseOutput(outputString)?.routes
  return (
    Array.isArray(routes) &&
    routes.every((r, i) => {
      const current = r.places
        .map((p) => p.placeId)
        .sort((a, b) => a - b)
        .join(',')
      return routes.slice(0, i).every(
        (other) =>
          other.places
            .map((p) => p.placeId)
            .sort((a, b) => a - b)
            .join(',') !== current,
      )
    })
  )
}
