import { PlaceTagCode } from './enums/place-tag-code.enum'
import { PlaceTagRepository } from './place-tag.repository'

function createRepository(
  rows: { placeId: string; tagCode: PlaceTagCode }[] = [],
) {
  const queryBuilder = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(rows),
  }
  const placeTagRepository = {
    createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
  }
  const dataSource = {
    getRepository: jest.fn().mockReturnValue(placeTagRepository),
  }
  const repository = new PlaceTagRepository(dataSource as never)

  return { repository, dataSource, queryBuilder }
}

describe('PlaceTagRepository', () => {
  it('placeId가 비어 있으면 쿼리 없이 빈 Map을 반환한다', async () => {
    const { repository, dataSource } = createRepository()

    const result = await repository.findTagCodesByPlaceIds([])

    expect(result).toEqual(new Map())
    expect(dataSource.getRepository).not.toHaveBeenCalled()
  })

  it('같은 placeId의 태그 코드를 하나의 배열로 묶어 Map으로 반환한다', async () => {
    const { repository, queryBuilder } = createRepository([
      { placeId: '1', tagCode: PlaceTagCode.HighPreference },
      { placeId: '1', tagCode: PlaceTagCode.SafeChoice },
      { placeId: '2', tagCode: PlaceTagCode.FrequentlySelected },
    ])

    const result = await repository.findTagCodesByPlaceIds(['1', '2'])

    expect(result).toEqual(
      new Map([
        ['1', [PlaceTagCode.HighPreference, PlaceTagCode.SafeChoice]],
        ['2', [PlaceTagCode.FrequentlySelected]],
      ]),
    )
    expect(queryBuilder.where).toHaveBeenCalledWith(
      'placeTag.placeId IN (:...placeIds)',
      { placeIds: ['1', '2'] },
    )
  })

  it('중복된 placeId는 하나로 합쳐 조회한다', async () => {
    const { repository, queryBuilder } = createRepository([])

    await repository.findTagCodesByPlaceIds(['1', '1', '2'])

    expect(queryBuilder.where).toHaveBeenCalledWith(
      'placeTag.placeId IN (:...placeIds)',
      { placeIds: ['1', '2'] },
    )
  })

  it('태그가 없는 placeId는 반환된 Map에 키 자체가 없다', async () => {
    const { repository } = createRepository([])

    const result = await repository.findTagCodesByPlaceIds(['1'])

    expect(result.has('1')).toBe(false)
  })
})
