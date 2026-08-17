import { getCorsOrigins } from './cors'

describe('getCorsOrigins', () => {
  it('parses comma-separated origins from the environment', () => {
    expect(
      getCorsOrigins(
        ' http://localhost:5173, https://dnd-15th-3-frontend.pages.dev/ ',
      ),
    ).toEqual([
      'http://localhost:5173',
      'https://dnd-15th-3-frontend.pages.dev',
    ])
  })

  it('converts a wildcard subdomain origin into a strict regular expression', () => {
    const [origin] = getCorsOrigins('https://*.dnd-15th-3-frontend.pages.dev')

    expect(origin).toBeInstanceOf(RegExp)
    if (!(origin instanceof RegExp)) throw new Error('Expected a RegExp origin')

    expect(origin.test('https://preview.dnd-15th-3-frontend.pages.dev')).toBe(
      true,
    )
    expect(origin.test('https://dnd-15th-3-frontend.pages.dev')).toBe(false)
    expect(
      origin.test('https://preview.dnd-15th-3-frontend.pages.dev.example.com'),
    ).toBe(false)
  })
})
