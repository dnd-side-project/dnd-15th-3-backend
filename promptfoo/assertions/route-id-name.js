// biome-ignore lint/style/noCommonJs: Promptfoo loads custom assertions via CommonJS.
const { parseOutput } = require('../helpers/parse-output.cjs')

// LLM은 접미사(코스)를 뺀 설명 부분만 출력한다. 서버가 그 뒤에 접미사를 붙인다.
const NAME_PREFIX_MIN_LENGTH = 2
const NAME_PREFIX_MAX_LENGTH = 9
const NAME_FORBIDDEN_SUBSTRING = '코스'

// biome-ignore lint/style/noCommonJs: Promptfoo loads custom assertions via CommonJS.
module.exports = function (outputString) {
  const routes = parseOutput(outputString)?.routes
  if (!Array.isArray(routes)) return false

  const idsSequential = routes.every((r, i) => r.routeId === i + 1)
  const namesValid = routes.every(
    (r) =>
      typeof r.name === 'string' &&
      r.name.length >= NAME_PREFIX_MIN_LENGTH &&
      r.name.length <= NAME_PREFIX_MAX_LENGTH &&
      r.name.trim().length > 0 &&
      !r.name.includes(NAME_FORBIDDEN_SUBSTRING),
  )
  const names = routes.map((r) => r.name?.trim())
  const namesUnique = new Set(names).size === names.length

  return idsSequential && namesValid && namesUnique
}
