// biome-ignore lint/style/noCommonJs: Promptfoo loads custom assertions via CommonJS.
const { parseOutput } = require('../helpers/parse-output.cjs')

// biome-ignore lint/style/noCommonJs: Promptfoo loads custom assertions via CommonJS.
module.exports = function (outputString, context) {
  const input = JSON.parse(context.vars.inputJson)
  const routes = parseOutput(outputString)?.routes
  const categoryByPlaceId = new Map(
    input.places.map((place) => [place.id, place.category]),
  )
  return (
    Array.isArray(routes) &&
    routes.every(
      (r) =>
        r.places.length === input.visitOrder.length &&
        r.places.every(
          (p, i) => categoryByPlaceId.get(p.placeId) === input.visitOrder[i],
        ),
    )
  )
}
