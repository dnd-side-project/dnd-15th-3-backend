const DISLIKE_WEIGHT = 1.5

export function calculatePreferenceScore(
  likeCount: number,
  dislikeCount: number,
): number {
  return likeCount - dislikeCount * DISLIKE_WEIGHT
}
