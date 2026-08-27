import {
  buildDistanceMatrixValues,
  START_NODE_ID,
} from './course-generator-input.distance-matrix'

describe('buildDistanceMatrixValues', () => {
  it('start에서 첫 단계, 이후 인접한 단계 사이의 거리만 조회한다', async () => {
    const calls: [string, string][] = []
    const getDistance = jest.fn((fromId: string, toId: string) => {
      calls.push([fromId, toId])
      return Promise.resolve(100)
    })

    const values = await buildDistanceMatrixValues(
      [[{ id: 'r1' }, { id: 'r2' }], [{ id: 'c1' }]],
      getDistance,
    )

    expect(calls.sort()).toEqual(
      [
        [START_NODE_ID, 'r1'],
        [START_NODE_ID, 'r2'],
        ['r1', 'c1'],
        ['r2', 'c1'],
      ].sort(),
    )
    expect(values).toEqual({
      [START_NODE_ID]: { r1: 100, r2: 100 },
      r1: { c1: 100 },
      r2: { c1: 100 },
    })
  })

  it('경로를 찾을 수 없는 쌍(null)은 결과에서 빠진다', async () => {
    const getDistance = jest.fn((_fromId: string, toId: string) =>
      Promise.resolve(toId === 'unreachable' ? null : 50),
    )

    const values = await buildDistanceMatrixValues(
      [[{ id: 'reachable' }, { id: 'unreachable' }]],
      getDistance,
    )

    expect(values).toEqual({ [START_NODE_ID]: { reachable: 50 } })
  })

  it('같은 장소로의 자기 자신 이동은 조회하지 않는다', async () => {
    const getDistance = jest.fn(() => Promise.resolve(10))

    await buildDistanceMatrixValues(
      [[{ id: 'a' }], [{ id: 'a' }, { id: 'b' }]],
      getDistance,
    )

    expect(getDistance).not.toHaveBeenCalledWith('a', 'a')
  })

  it('카테고리가 번갈아 반복돼 같은 (from, to) 쌍이 다시 나오면 한 번만 조회한다', async () => {
    const getDistance = jest.fn(() => Promise.resolve(20))

    // cafe1->rest1 쌍이 2번째, 4번째 단계 전환에서 두 번 등장하지만 조회는 한 번만
    await buildDistanceMatrixValues(
      [
        [{ id: 'cafe1' }],
        [{ id: 'rest1' }],
        [{ id: 'cafe1' }],
        [{ id: 'rest1' }],
      ],
      getDistance,
    )

    // start->cafe1, cafe1->rest1, rest1->cafe1: 총 3번, 중복 없음
    expect(getDistance).toHaveBeenCalledTimes(3)
  })
})
