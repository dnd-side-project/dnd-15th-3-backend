import { BadRequestException, NotFoundException } from '@nestjs/common'
import { MockApiService } from 'src/mock/mock-api.service'
import { CatalogController } from './catalog.controller'

function createController() {
  const mockApi = {
    requireEnabled: jest.fn(),
    searchPlaces: jest.fn().mockReturnValue([]),
  }

  return {
    controller: new CatalogController(mockApi as unknown as MockApiService),
    mockApi,
  }
}

describe('CatalogController', () => {
  it('passes search filters to the mock service', () => {
    const { controller, mockApi } = createController()
    mockApi.searchPlaces.mockReturnValue([{ id: '301' }])
    const searchPlaces = controller.searchPlaces.bind(controller) as (
      keyword: string,
      categoryId?: string,
    ) => unknown[]

    searchPlaces('성수', '2')

    expect(mockApi.searchPlaces).toHaveBeenCalledWith('성수', '2')
  })

  it('returns not found when no places match the search', () => {
    const { controller } = createController()

    expect(() => controller.searchPlaces('없는 장소')).toThrow(
      NotFoundException,
    )
  })

  it('rejects an empty search keyword', () => {
    const { controller } = createController()

    expect(() => controller.searchPlaces(' ')).toThrow(BadRequestException)
  })
})
