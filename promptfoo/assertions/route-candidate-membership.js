// biome-ignore lint/style/noCommonJs: Promptfoo loads custom assertions via CommonJS.
const { sequenceKey } = require('../helpers/course-candidates.cjs')
// biome-ignore lint/style/noCommonJs: Promptfoo loads custom assertions via CommonJS.
const { parseOutput } = require('../helpers/parse-output.cjs')

function parseInput(context) {
  const rawInput = context?.vars?.inputJson
  return typeof rawInput === 'string' ? JSON.parse(rawInput) : rawInput
}

// biome-ignore lint/style/noCommonJs: Promptfoo loads custom assertions via CommonJS.
module.exports = function (outputString, context) {
  const input = parseInput(context)
  const routes = parseOutput(outputString)?.routes
  if (!Array.isArray(routes) || !Array.isArray(input?.routeCandidates)) {
    return false
  }

  const candidateSequences = new Set(
    input.routeCandidates.map((candidate) => sequenceKey(candidate.placeIds)),
  )

  return routes.every((route) => {
    const outputSequence = sequenceKey(
      route.places.map((place) => place.placeId),
    )
    return candidateSequences.has(outputSequence)
  })
}
