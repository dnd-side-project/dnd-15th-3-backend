// biome-ignore lint/style/noCommonJs: Promptfoo loads custom assertions via CommonJS.
module.exports = function (_outputString, context) {
  const rawInput = context?.vars?.inputJson
  const input = typeof rawInput === 'string' ? JSON.parse(rawInput) : rawInput
  const matrix = input?.distanceMatrix
  const placeKeys = ['category', 'id', 'name', 'score', 'tags']

  if (
    input?.startNodeId !== 'start' ||
    matrix?.unit !== 'meter' ||
    matrix?.metric !== 'walking_network_distance' ||
    matrix?.directed !== true ||
    !matrix.values ||
    !Array.isArray(input.places)
  ) {
    return false
  }

  const placesByCategory = new Map()
  for (const place of input.places) {
    const places = placesByCategory.get(place.category) ?? []
    places.push(place)
    placesByCategory.set(place.category, places)
  }

  const hasDistance = (from, to) => {
    const fromKey = from === 'start' ? 'start' : String(from)
    const distance = matrix.values[fromKey]?.[String(to)]
    return (
      typeof distance === 'number' && Number.isFinite(distance) && distance >= 0
    )
  }

  const allTransitionsExist = input.visitOrder.every((category, index) => {
    const fromPlaces =
      index === 0
        ? [{ id: 'start' }]
        : (placesByCategory.get(input.visitOrder[index - 1]) ?? [])
    const toPlaces = placesByCategory.get(category) ?? []

    return fromPlaces.every((from) =>
      toPlaces.every((to) => {
        if (from.id !== 'start' && from.id === to.id) return true
        return hasDistance(from.id, to.id)
      }),
    )
  })

  return (
    allTransitionsExist &&
    input.places.every((place) => {
      const keys = Object.keys(place).sort()
      return (
        keys.length === placeKeys.length &&
        placeKeys.every((key, index) => keys[index] === key)
      )
    })
  )
}
