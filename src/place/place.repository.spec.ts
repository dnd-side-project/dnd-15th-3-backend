import { DataSource } from 'typeorm'
import { PlaceRepository, shuffle } from './place.repository'
import type { PlaceSearchRequest } from './schema/place-search-request.schema'

const request: PlaceSearchRequest = {
  meetingId: '123',
  accessToken: 'token',
  page: 2,
  size: 20,
}

describe('PlaceRepository', () => {
  it('PostGIS 반경 쿼리를 미터 단위로 실행하고 결과를 변환한다', async () => {
    const dataSource = {
      query: jest
        .fn()
        .mockResolvedValueOnce([
          {
            id: '10',
            name: '성수 카페',
            address: '서울 성동구 성수이로 1',
            latitude: 37.5446,
            longitude: 127.0557,
            previewUrl: null,
            categoryId: '1',
            categoryName: '카페',
            categorySlug: 'cafe',
            distanceMeters: 352.4,
          },
        ])
        .mockResolvedValueOnce([{ total: '21' }]),
    }
    const repository = new PlaceRepository(dataSource as unknown as DataSource)

    await expect(
      repository.findNearby(request, 37.544, 127.055),
    ).resolves.toEqual({
      items: [
        {
          id: '10',
          name: '성수 카페',
          address: '서울 성동구 성수이로 1',
          category: { id: '1', name: '카페', slug: 'cafe' },
          latitude: 37.5446,
          longitude: 127.0557,
          distanceMeters: 352.4,
          previewUrl: null,
          previewImage: null,
        },
      ],
      total: 21,
    })

    expect(dataSource.query).toHaveBeenCalledTimes(2)
    const [selectQuery, selectParameters] = dataSource.query.mock.calls[0]
    expect(selectQuery).toContain('ST_DWithin')
    expect(selectQuery).toContain('geography')
    expect(selectQuery).toContain('ORDER BY "distanceMeters" ASC')
    expect(selectParameters).toEqual([127.055, 37.544, 2000, 20, 20])
  })

  it('카테고리 필터를 SQL 파라미터로 추가한다', async () => {
    const dataSource = {
      query: jest
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: '0' }]),
    }
    const repository = new PlaceRepository(dataSource as unknown as DataSource)

    await repository.findNearby(
      { ...request, page: 1, categoryId: '6' },
      37.5,
      127,
    )

    const [selectQuery, selectParameters] = dataSource.query.mock.calls[0]
    expect(selectQuery).toContain('"category"."id" = $4')
    expect(selectParameters).toEqual([127, 37.5, 2000, '6', 20, 0])
  })

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
            previewUrl: null,
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
          previewUrl: null,
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
          previewUrl: null,
        },
        {
          id: '2',
          name: 'B',
          address: 'B',
          latitude: 2,
          longitude: 2,
          previewUrl: null,
        },
        {
          id: '3',
          name: 'C',
          address: 'C',
          latitude: 3,
          longitude: 3,
          previewUrl: null,
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
            previewUrl: null,
          },
          {
            id: '3',
            name: 'C',
            address: 'C',
            latitude: 3,
            longitude: 3,
            previewUrl: null,
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
