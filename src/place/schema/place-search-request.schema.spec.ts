import { placeSearchRequestSchema } from './place-search-request.schema'

describe('placeSearchRequestSchema', () => {
  it('기본 페이지 값을 적용한다', () => {
    expect(
      placeSearchRequestSchema.parse({
        meetingId: '123',
        accessToken: 'token',
      }),
    ).toMatchObject({
      meetingId: '123',
      accessToken: 'token',
      page: 1,
      size: 20,
    })
  })

  it('페이지 크기를 최대 50으로 제한한다', () => {
    expect(() =>
      placeSearchRequestSchema.parse({ meetingId: '123', size: '51' }),
    ).toThrow()
  })

  it('양의 정수가 아닌 ID를 거부한다', () => {
    expect(() => placeSearchRequestSchema.parse({ meetingId: '0' })).toThrow()
    expect(() => placeSearchRequestSchema.parse({ meetingId: 'abc' })).toThrow()
  })
})
