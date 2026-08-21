function compositionKey(placeIds) {
  return [...placeIds].sort().join(',')
}

function sequenceKey(placeIds) {
  return placeIds.join(',')
}

const STRATEGIES = ['distance_minimization', 'preference_first', 'balanced']

function getDistance(input, from, to) {
  const fromKey = from === 'start' ? 'start' : String(from)
  const distance = input.distanceMatrix?.values?.[fromKey]?.[String(to)]
  return typeof distance === 'number' && Number.isFinite(distance)
    ? distance
    : null
}

function enumerateRoutes(input) {
  const placesByCategory = new Map()

  for (const place of input.places) {
    const places = placesByCategory.get(place.category) ?? []
    places.push(place)
    placesByCategory.set(place.category, places)
  }

  const candidates = []

  function visit(index, selected, usedIds, totalDistance, totalScore) {
    if (index === input.visitOrder.length) {
      const placeIds = selected.map((place) => place.id)
      candidates.push({
        placeIds,
        composition: compositionKey(placeIds),
        sequence: sequenceKey(placeIds),
        distance: totalDistance,
        score: totalScore,
      })
      return
    }

    const category = input.visitOrder[index]
    const places = placesByCategory.get(category) ?? []
    const from = index === 0 ? 'start' : selected[index - 1].id

    for (const place of places) {
      if (usedIds.has(place.id)) continue

      const edgeDistance = getDistance(input, from, place.id)
      if (edgeDistance === null) continue

      usedIds.add(place.id)
      selected.push(place)
      visit(
        index + 1,
        selected,
        usedIds,
        totalDistance + edgeDistance,
        totalScore + place.score,
      )
      selected.pop()
      usedIds.delete(place.id)
    }
  }

  visit(0, [], new Set(), 0, 0)
  return candidates
}

function buildRouteCandidates(input) {
  return enumerateRoutes(input).map((candidate) => ({
    placeIds: candidate.placeIds,
    totalDistanceMeters: candidate.distance,
    totalScore: candidate.score,
  }))
}

function compareDistanceThenScore(left, right) {
  if (left.totalDistanceMeters !== right.totalDistanceMeters) {
    return left.totalDistanceMeters - right.totalDistanceMeters
  }
  if (left.totalScore !== right.totalScore) {
    return right.totalScore - left.totalScore
  }
  return sequenceKey(left.placeIds).localeCompare(sequenceKey(right.placeIds))
}

function compareScoreThenDistance(left, right) {
  if (left.totalScore !== right.totalScore) {
    return right.totalScore - left.totalScore
  }
  if (left.totalDistanceMeters !== right.totalDistanceMeters) {
    return left.totalDistanceMeters - right.totalDistanceMeters
  }
  return sequenceKey(left.placeIds).localeCompare(sequenceKey(right.placeIds))
}

function buildSelectionPools(input, candidates) {
  const topK = input.strategyConfig?.variationTopK ?? 5
  const balancedMaxDistanceRatio =
    input.strategyConfig?.balancedMaxDistanceRatio ?? 1.2
  const shortestDistance = Math.min(
    ...candidates.map((candidate) => candidate.totalDistanceMeters),
  )
  const pools = {}

  for (const strategy of STRATEGIES) {
    let ranking = candidates
    if (strategy === 'distance_minimization') {
      ranking = [...candidates].sort(compareDistanceThenScore)
    } else if (strategy === 'preference_first') {
      ranking = [...candidates].sort(compareScoreThenDistance)
    } else {
      ranking = candidates
        .filter(
          (candidate) =>
            candidate.totalDistanceMeters <=
            shortestDistance * balancedMaxDistanceRatio,
        )
        .sort(compareScoreThenDistance)
    }

    const pool = []
    const compositions = new Set()
    for (const candidate of ranking) {
      const composition = compositionKey(candidate.placeIds)
      if (compositions.has(composition)) continue
      pool.push(candidate)
      compositions.add(composition)
      if (pool.length >= topK) break
    }
    pools[strategy] = pool
  }

  return pools
}

function compactCandidates(selectionPools) {
  const candidates = new Map()
  for (const pool of Object.values(selectionPools)) {
    for (const candidate of pool) {
      candidates.set(compositionKey(candidate.placeIds), candidate)
    }
  }
  return [...candidates.values()]
}

function buildStrategyDefaults(selectionPools) {
  const usedCompositions = new Set()
  const defaults = []

  for (const strategy of STRATEGIES) {
    const candidate = (selectionPools[strategy] ?? []).find((route) => {
      const composition = compositionKey(route.placeIds)
      return !usedCompositions.has(composition)
    })
    if (!candidate) continue

    usedCompositions.add(compositionKey(candidate.placeIds))
    defaults.push({ strategy, placeIds: candidate.placeIds })
  }

  return defaults
}

module.exports = {
  buildStrategyDefaults,
  buildRouteCandidates,
  buildSelectionPools,
  compactCandidates,
  compositionKey,
  enumerateRoutes,
  sequenceKey,
}
