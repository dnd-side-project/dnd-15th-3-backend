const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const {
  buildRouteCandidates,
  buildSelectionPools,
  buildStrategyDefaults,
  reduceRouteCandidatesByDiversity,
} = require('../helpers/course-candidates.cjs')

function parseInput(rawInput) {
  if (typeof rawInput !== 'string') return rawInput
  if (!rawInput.startsWith('file://')) return JSON.parse(rawInput)

  const relativePath = rawInput.slice('file://'.length)
  const fixturePath = resolve(__dirname, '..', relativePath)
  return JSON.parse(readFileSync(fixturePath, 'utf8'))
}

function prepareInput(rawInput, generationOptions = {}, reduceCandidatesTo) {
  const input = parseInput(rawInput)
  if (!input || Array.isArray(input) || input.routeCandidates) return input

  const allRouteCandidates = buildRouteCandidates(input)
  const strategyConfig = input.strategyConfig ?? {
    balancedMaxDistanceRatio: 1.2,
    variationTopK: 5,
    beamWidth: 500,
    maxSearchStates: 10_000,
  }
  const selectionPools = buildSelectionPools(
    { ...input, strategyConfig },
    allRouteCandidates,
  )
  const strategyDefaults = buildStrategyDefaults(selectionPools)

  // reduceCandidatesTo가 없으면 기존 동작(전체 routeCandidates 전달) 그대로 유지.
  const routeCandidates = reduceCandidatesTo
    ? reduceRouteCandidatesByDiversity(
        allRouteCandidates,
        strategyDefaults,
        input.places,
        reduceCandidatesTo,
      )
    : allRouteCandidates

  return {
    ...input,
    ...generationOptions,
    strategyConfig,
    maxUniqueRoutes: routeCandidates.length,
    routeCandidates,
    strategyDefaults,
  }
}

module.exports = function beforeEach(context) {
  const vars = context.test?.vars ?? {}
  const input = prepareInput(
    vars.inputJson,
    {
      generationMode: vars.generationMode ?? 'initial',
      ...(vars.variationSeed ? { variationSeed: vars.variationSeed } : {}),
      ...(vars.feedbackConstraints
        ? { feedbackConstraints: vars.feedbackConstraints }
        : {}),
    },
    vars.reduceCandidatesTo,
  )

  return {
    test: {
      ...context.test,
      vars: {
        ...vars,
        inputJson: JSON.stringify(input),
      },
    },
  }
}
