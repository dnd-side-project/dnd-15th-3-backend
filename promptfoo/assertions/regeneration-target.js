// biome-ignore lint/style/noCommonJs: Promptfoo loads custom assertions via CommonJS.
const { parseOutput } = require('../helpers/parse-output.cjs')

function parseInput(context) {
  const rawInput = context?.vars?.inputJson
  return typeof rawInput === 'string' ? JSON.parse(rawInput) : rawInput
}

// biome-ignore lint/style/noCommonJs: Promptfoo loads custom assertions via CommonJS.
module.exports = function (outputString, context) {
  const input = parseInput(context)
  if (input?.generationMode !== 'regenerate-one') return true

  const routes = parseOutput(outputString)?.routes
  return (
    Array.isArray(routes) &&
    routes.length === 1 &&
    routes[0]?.strategy === input.targetStrategy
  )
}
