import { getCorsOrigins } from './cors'

describe('getCorsOrigins', () => {
  it('parses comma-separated origins from the environment', () => {
    expect(getCorsOrigins(' https://dnd-15th-3-frontend.pages.dev/ ')).toEqual([
      'https://dnd-15th-3-frontend.pages.dev',
    ])
  })
})
