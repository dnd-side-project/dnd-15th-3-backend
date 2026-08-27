function parseOutput(outputString) {
  if (typeof outputString !== 'string') return null

  try {
    const output = JSON.parse(outputString)
    return output && typeof output === 'object' && !Array.isArray(output)
      ? output
      : null
  } catch {
    return null
  }
}

module.exports = { parseOutput }
