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

function isBetterCandidate(candidate, existing) {
  if (candidate.distance !== existing.distance) {
    return candidate.distance < existing.distance
  }
  if (candidate.score !== existing.score) {
    return candidate.score > existing.score
  }
  return candidate.sequence.localeCompare(existing.sequence) < 0
}

function enumerateRoutes(input) {
  const placesByCategory = new Map()

  for (const place of input.places) {
    const places = placesByCategory.get(place.category) ?? []
    places.push(place)
    placesByCategory.set(place.category, places)
  }

  // 카테고리가 중복되는 슬롯(예: 액티비티 2곳)이 있으면 방문 순서만 다르고
  // 장소 구성은 같은 후보가 여러 번 나올 수 있다. composition(정렬된 placeIds)을
  // 키로 삼아 그중 가장 나은 후보 하나만 남긴다.
  const candidatesByComposition = new Map()

  function visit(index, selected, usedIds, totalDistance, totalScore) {
    if (index === input.visitOrder.length) {
      const placeIds = selected.map((place) => place.id)
      const composition = compositionKey(placeIds)
      const candidate = {
        placeIds,
        composition,
        sequence: sequenceKey(placeIds),
        distance: totalDistance,
        score: totalScore,
      }
      const existing = candidatesByComposition.get(composition)
      if (!existing || isBetterCandidate(candidate, existing)) {
        candidatesByComposition.set(composition, candidate)
      }
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
  return [...candidatesByComposition.values()]
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
  compositionKey,
  enumerateRoutes,
  sequenceKey,
}
