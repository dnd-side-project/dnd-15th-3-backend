// biome-ignore lint/style/noCommonJs: Promptfoo loads custom assertions via CommonJS.
module.exports = function (outputString, context) {
  const input = JSON.parse(context.vars.inputJson)
  const scores = new Map(input.places.map((p) => [p.id, p.score]))
  const routes = JSON.parse(outputString).routes
  const preferenceRoute = routes.find((r) => r.strategy === '선호도우선')
  if (!preferenceRoute) return false
  const preferenceSum = preferenceRoute.places.reduce(
    (sum, p) => sum + scores.get(p.placeId),
    0,
  )
  return routes.every((r) => {
    const sum = r.places.reduce((acc, p) => acc + scores.get(p.placeId), 0)
    return sum <= preferenceSum
  })
}
