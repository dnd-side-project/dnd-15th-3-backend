import { calculatePreferenceScore } from './place-preference-score.utils'

describe('calculatePreferenceScore', () => {
  it.each([
    [0, 0, 0],
    [5, 0, 5],
    [0, 5, -7.5],
    [10, 1, 8.5],
    [3, 2, 0],
    [1, 1, -0.5],
  ])(
    '좋아요 %i개, 싫어요 %i개면 점수는 %f이다',
    (likeCount, dislikeCount, expectedScore) => {
      expect(calculatePreferenceScore(likeCount, dislikeCount)).toBe(
        expectedScore,
      )
    },
  )

  it('싫어요 1개는 좋아요 1개보다 더 크게 깎는다 (비대칭 가중치)', () => {
    const onlyLike = calculatePreferenceScore(1, 0)
    const onlyDislike = calculatePreferenceScore(0, 1)

    expect(Math.abs(onlyDislike)).toBeGreaterThan(Math.abs(onlyLike))
  })
})
