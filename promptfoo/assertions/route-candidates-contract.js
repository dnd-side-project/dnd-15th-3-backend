// biome-ignore lint/style/noCommonJs: Promptfoo loads custom assertions via CommonJS.
module.exports = function (_outputString, context) {
  const rawInput = context?.vars?.inputJson
  const input = typeof rawInput === 'string' ? JSON.parse(rawInput) : rawInput
  const candidates = input?.routeCandidates
  const placesById = new Map(
    (input?.places ?? []).map((place) => [place.id, place]),
  )

  if (!Array.isArray(candidates) || candidates.length === 0) return false

  return candidates.every((candidate) => {
    if (
      !candidate ||
      !Array.isArray(candidate.placeIds) ||
      candidate.placeIds.length !== input.visitOrder.length ||
      typeof candidate.totalDistanceMeters !== 'number' ||
      !Number.isFinite(candidate.totalDistanceMeters) ||
      candidate.totalDistanceMeters < 0 ||
      typeof candidate.totalScore !== 'number' ||
      !Number.isFinite(candidate.totalScore) ||
      new Set(candidate.placeIds).size !== candidate.placeIds.length
    ) {
      return false
    }

    let previousNodeId = 'start'
    let verifiedDistance = 0
    let verifiedScore = 0

    for (const [index, placeId] of candidate.placeIds.entries()) {
      const place = placesById.get(placeId)
      const distance =
        input.distanceMatrix.values[previousNodeId]?.[String(placeId)]

      if (
        !place ||
        place.category !== input.visitOrder[index] ||
        typeof distance !== 'number' ||
        !Number.isFinite(distance) ||
        distance < 0
      ) {
        return false
      }

      verifiedDistance += distance
      verifiedScore += place.score
      previousNodeId = String(placeId)
    }

    return (
      Math.abs(verifiedDistance - candidate.totalDistanceMeters) <= 1e-9 &&
      Math.abs(verifiedScore - candidate.totalScore) <= 1e-9
    )
  })
}
