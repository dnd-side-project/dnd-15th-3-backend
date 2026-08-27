import { DataSource } from 'typeorm'
import { PlaceSource } from './enums/place-source.enum'
import { PlaceRepository, shuffle } from './place.repository'

function googlePlaceFields(providerPlaceId: string) {
  return {
    source: PlaceSource.Google,
    providerPlaceId,
    roadAddress: null,
    phone: null,
    placeUrl: null,
  }
}

describe('PlaceRepository', () => {
  describe('findSimilar', () => {
    it('카테고리·반경·제외 목록 조건으로 가까운 순 후보를 조회한다', async () => {
      const dataSource = {
        query: jest.fn().mockResolvedValue([
          {
            id: '11',
            name: '성수 카페 2',
            address: '서울 성동구 성수이로 2',
            latitude: 37.5447,
            longitude: 127.0558,
            ...googlePlaceFields('google-11'),
          },
        ]),
      }
      const repository = new PlaceRepository(
        dataSource as unknown as DataSource,
      )

      await expect(
        repository.findSimilar('1', ['10', '20'], 37.544, 127.055, 2000, 5),
      ).resolves.toEqual([
        {
          id: '11',
          name: '성수 카페 2',
          address: '서울 성동구 성수이로 2',
          latitude: 37.5447,
          longitude: 127.0558,
          ...googlePlaceFields('google-11'),
        },
      ])

      expect(dataSource.query).toHaveBeenCalledTimes(1)
      const [selectQuery, selectParameters] = dataSource.query.mock.calls[0]
      expect(selectQuery).toContain('ST_DWithin')
      expect(selectQuery).toContain('geography')
      expect(selectQuery).toContain('ORDER BY "place"."location" <->')
      expect(selectParameters).toEqual([
        '1',
        ['10', '20'],
        127.055,
        37.544,
        2000,
        200,
      ])
    })

    it('후보 풀이 limit보다 많으면 무작위로 섞은 뒤 limit개만 반환한다', async () => {
      const candidateRows = [
        {
          id: '1',
          name: 'A',
          address: 'A',
          latitude: 1,
          longitude: 1,
          ...googlePlaceFields('google-1'),
        },
        {
          id: '2',
          name: 'B',
          address: 'B',
          latitude: 2,
          longitude: 2,
          ...googlePlaceFields('google-2'),
        },
        {
          id: '3',
          name: 'C',
          address: 'C',
          latitude: 3,
          longitude: 3,
          ...googlePlaceFields('google-3'),
        },
      ]
      const dataSource = {
        query: jest.fn().mockResolvedValue(candidateRows),
      }
      const repository = new PlaceRepository(
        dataSource as unknown as DataSource,
      )
      const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0)

      try {
        await expect(
          repository.findSimilar('1', [], 37.544, 127.055, 2000, 2),
        ).resolves.toEqual([
          {
            id: '2',
            name: 'B',
            address: 'B',
            latitude: 2,
            longitude: 2,
            ...googlePlaceFields('google-2'),
          },
          {
            id: '3',
            name: 'C',
            address: 'C',
            latitude: 3,
            longitude: 3,
            ...googlePlaceFields('google-3'),
          },
        ])
      } finally {
        randomSpy.mockRestore()
      }
    })
  })
})

describe('shuffle', () => {
  it('빈 배열은 그대로 반환하고 Math.random을 호출하지 않는다', () => {
    const randomSpy = jest.spyOn(Math, 'random')

    expect(shuffle([])).toEqual([])
    expect(randomSpy).not.toHaveBeenCalled()

    randomSpy.mockRestore()
  })

  it('원소가 하나면 그대로 반환한다', () => {
    expect(shuffle(['only'])).toEqual(['only'])
  })

  it('Math.random 값에 따라 결정적으로 순서를 뒤섞는다 (Fisher-Yates)', () => {
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0)

    try {
      expect(shuffle(['a', 'b', 'c'])).toEqual(['b', 'c', 'a'])
    } finally {
      randomSpy.mockRestore()
    }
  })

  it('원본 배열은 변경하지 않는다', () => {
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.5)
    const original = ['a', 'b', 'c']

    try {
      shuffle(original)
      expect(original).toEqual(['a', 'b', 'c'])
    } finally {
      randomSpy.mockRestore()
    }
  })

  it('셔플 결과는 원본과 같은 원소 구성을 유지한다', () => {
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.37)
    const original = [1, 2, 3, 4, 5]

    try {
      expect(shuffle(original).sort()).toEqual([...original].sort())
    } finally {
      randomSpy.mockRestore()
    }
  })
})
