// biome-ignore lint/style/noCommonJs: Promptfoo loads custom assertions via CommonJS.
const { parseOutput } = require('../helpers/parse-output.cjs')

const NAME_MIN_LENGTH = 5
const NAME_MAX_LENGTH = 10

// biome-ignore lint/style/noCommonJs: Promptfoo loads custom assertions via CommonJS.
module.exports = function (outputString) {
  const routes = parseOutput(outputString)?.routes
  if (!Array.isArray(routes)) return false

  const idsSequential = routes.every((r, i) => r.routeId === i + 1)
  const namesValid = routes.every(
    (r) =>
      typeof r.name === 'string' &&
      r.name.length >= NAME_MIN_LENGTH &&
      r.name.length <= NAME_MAX_LENGTH &&
      r.name.trim().length > 0,
  )
  const names = routes.map((r) => r.name?.trim())
  const namesUnique = new Set(names).size === names.length

  return idsSequential && namesValid && namesUnique
}
