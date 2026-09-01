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

const DEFAULT_DIVERSITY_WEIGHTS = { positional: 0.7, tag: 0.3 }

function buildPlaceTagIndex(places) {
  const index = new Map()
  for (const place of places ?? []) {
    index.set(place.id, new Set(place.tags ?? []))
  }
  return index
}

function routeTagSet(placeIds, placeTagIndex) {
  const tags = new Set()
  for (const placeId of placeIds) {
    for (const tag of placeTagIndex.get(placeId) ?? []) {
      tags.add(tag)
    }
  }
  return tags
}

// 두 후보가 같은 슬롯(방문 순서 위치)에서 얼마나 다른 장소를 썼는지 비율로 나타낸다.
function positionalDiff(placeIdsA, placeIdsB) {
  let diffCount = 0
  for (let index = 0; index < placeIdsA.length; index += 1) {
    if (placeIdsA[index] !== placeIdsB[index]) diffCount += 1
  }
  return diffCount / placeIdsA.length
}

function tagDiff(tagSetA, tagSetB) {
  if (tagSetA.size === 0 && tagSetB.size === 0) return null

  let intersectionSize = 0
  for (const tag of tagSetA) {
    if (tagSetB.has(tag)) intersectionSize += 1
  }
  const unionSize = tagSetA.size + tagSetB.size - intersectionSize
  if (unionSize === 0) return null

  return 1 - intersectionSize / unionSize
}

function candidateDissimilarity(candidateA, candidateB, weights) {
  const posDiff = positionalDiff(candidateA.placeIds, candidateB.placeIds)
  const tagDifference = tagDiff(candidateA.tagSet, candidateB.tagSet)
  if (tagDifference === null) return posDiff
  return weights.positional * posDiff + weights.tag * tagDifference
}

/**
 * routeCandidates를 LLM에 넘기기 직전에, 점수순이 아니라 "서로 얼마나 다른가"
 * 기준으로 targetCount개까지 줄인다.
 * 1) strategyDefaults(전략별 검증된 대표 후보)를 항상 시드로 포함
 * 2) 나머지 후보 중 "이미 선택된 것들과 제일 가까운 거리"가 가장 큰 것을 하나씩 추가
 * 3) targetCount에 도달하거나 후보가 소진되면 종료
 */
function reduceRouteCandidatesByDiversity(
  candidates,
  strategyDefaults,
  places,
  targetCount,
  weights = DEFAULT_DIVERSITY_WEIGHTS,
) {
  if (!Number.isFinite(targetCount) || candidates.length <= targetCount) {
    return candidates
  }

  const placeTagIndex = buildPlaceTagIndex(places)
  const pool = candidates.map((candidate) => ({
    ...candidate,
    tagSet: routeTagSet(candidate.placeIds, placeTagIndex),
  }))

  const seedCompositions = new Set(
    (strategyDefaults ?? []).map((seed) => compositionKey(seed.placeIds)),
  )

  const selected = []
  const pending = []
  for (const candidate of pool) {
    if (seedCompositions.has(compositionKey(candidate.placeIds))) {
      selected.push(candidate)
    } else {
      pending.push(candidate)
    }
  }
  if (selected.length === 0 && pending.length > 0) {
    selected.push(pending.shift())
  }

  const closestDistance = new Map()
  for (const candidate of pending) {
    let minDist = Infinity
    for (const seed of selected) {
      const dist = candidateDissimilarity(candidate, seed, weights)
      if (dist < minDist) minDist = dist
    }
    closestDistance.set(candidate, minDist)
  }

  while (selected.length < targetCount && pending.length > 0) {
    let bestIndex = 0
    let bestDist = -Infinity
    for (let index = 0; index < pending.length; index += 1) {
      const dist = closestDistance.get(pending[index])
      if (dist > bestDist) {
        bestDist = dist
        bestIndex = index
      }
    }

    const [picked] = pending.splice(bestIndex, 1)
    closestDistance.delete(picked)
    selected.push(picked)

    for (const candidate of pending) {
      const dist = candidateDissimilarity(candidate, picked, weights)
      if (dist < closestDistance.get(candidate)) {
        closestDistance.set(candidate, dist)
      }
    }
  }

  return selected.map(({ tagSet, ...candidate }) => candidate)
}

module.exports = {
  buildStrategyDefaults,
  buildRouteCandidates,
  buildSelectionPools,
  reduceRouteCandidatesByDiversity,
  compositionKey,
  enumerateRoutes,
  sequenceKey,
}
