import { DataSource } from 'typeorm'
import { PlaceRepository } from './place.repository'
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
})
