module.exports = class MockCourseGenerator {
  constructor(options) {
    this.options = options
  }

  id() {
    return this.options.id || 'mock-course-generator'
  }

  callApi(_prompt, context) {
    const expected = context?.vars?.expectedOutput
    const output =
      typeof expected === 'string'
        ? expected
        : JSON.stringify(expected, null, 2)
    return { output }
  }
}
