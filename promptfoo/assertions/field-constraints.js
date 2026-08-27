// biome-ignore lint/style/noCommonJs: Promptfoo loads custom assertions via CommonJS.
const { parseOutput } = require('../helpers/parse-output.cjs')

// biome-ignore lint/style/noCommonJs: Promptfoo loads custom assertions via CommonJS.
module.exports = function (outputString) {
  const routes = parseOutput(outputString)?.routes
  const expectedKeys = ['placeId', 'order'].sort()
  return (
    Array.isArray(routes) &&
    routes.every((r) =>
      r.places.every((p) => {
        const keys = Object.keys(p).sort()
        return (
          keys.length === expectedKeys.length &&
          expectedKeys.every((k, i) => keys[i] === k)
        )
      }),
    )
  )
}
