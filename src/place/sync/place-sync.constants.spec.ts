import {
  buildCoverageTiles,
  haversineDistanceMeters,
  PLACE_SYNC_RADIUS_METERS,
} from './place-sync.constants'

describe('place sync coverage planner', () => {
  it('기준 위치 반경을 여러 coverage tile로 분할한다', () => {
    const tiles = buildCoverageTiles(37.4979, 127.0276)

    expect(tiles.length).toBeGreaterThan(1)
    expect(
      tiles.some(
        (tile) =>
          haversineDistanceMeters(
            37.4979,
            127.0276,
            tile.latitude,
            tile.longitude,
          ) <= PLACE_SYNC_RADIUS_METERS,
      ),
    ).toBe(true)
    expect(tiles[0]?.coverage.type).toBe('Polygon')
  })

  it('같은 좌표의 tile key는 반복 계산해도 안정적이다', () => {
    expect(buildCoverageTiles(37.5, 127).map((tile) => tile.key)).toEqual(
      buildCoverageTiles(37.5, 127).map((tile) => tile.key),
    )
  })

  it('서로 가까운 기준 위치는 겹치는 coverage tile을 공유한다', () => {
    const firstKeys = new Set(
      buildCoverageTiles(37.5, 127).map((tile) => tile.key),
    )
    const secondKeys = buildCoverageTiles(37.505, 127.005).map(
      (tile) => tile.key,
    )

    expect(secondKeys.some((key) => firstKeys.has(key))).toBe(true)
  })
})
