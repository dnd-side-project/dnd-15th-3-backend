const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const {
  buildRouteCandidates,
  buildSelectionPools,
  buildStrategyDefaults,
  compactCandidates,
} = require('../helpers/course-candidates.cjs')

function parseInput(rawInput) {
  if (typeof rawInput !== 'string') return rawInput
  if (!rawInput.startsWith('file://')) return JSON.parse(rawInput)

  const relativePath = rawInput.slice('file://'.length)
  const fixturePath = resolve(__dirname, '..', relativePath)
  return JSON.parse(readFileSync(fixturePath, 'utf8'))
}

function prepareInput(rawInput, generationOptions = {}) {
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
  const routeCandidates = compactCandidates(selectionPools)

  return {
    ...input,
    ...generationOptions,
    strategyConfig,
    maxUniqueRoutes: routeCandidates.length,
    routeCandidates,
    selectionPools,
    strategyDefaults: buildStrategyDefaults(selectionPools),
  }
}

module.exports = function beforeEach(context) {
  const vars = context.test?.vars ?? {}
  const input = prepareInput(vars.inputJson, {
    generationMode: vars.generationMode ?? 'initial',
    ...(vars.targetStrategy ? { targetStrategy: vars.targetStrategy } : {}),
    ...(vars.variationSeed ? { variationSeed: vars.variationSeed } : {}),
    ...(vars.feedbackConstraints
      ? { feedbackConstraints: vars.feedbackConstraints }
      : {}),
  })

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
