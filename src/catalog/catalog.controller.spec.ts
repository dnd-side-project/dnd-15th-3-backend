import { BadRequestException, NotFoundException } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { Test } from '@nestjs/testing'
import { CategorySlug } from 'src/category/enums/category-slug.enum'
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

  it('documents category slugs as a Swagger enum', async () => {
    const moduleFixture = await Test.createTestingModule({
      controllers: [CatalogController],
      providers: [
        {
          provide: MockApiService,
          useValue: { requireEnabled: jest.fn(), getCategories: jest.fn() },
        },
      ],
    }).compile()
    const app = moduleFixture.createNestApplication()
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().build(),
    )
    const schema = document.components?.schemas?.CategoryResponseDto as
      | {
          properties?: Record<string, { enum?: string[] }>
        }
      | undefined
    const enumSchema = document.components?.schemas?.CategorySlug as
      | { enum?: string[] }
      | undefined

    expect(enumSchema?.enum).toEqual(Object.values(CategorySlug))
    expect(schema?.properties?.slug).toMatchObject({
      allOf: [{ $ref: '#/components/schemas/CategorySlug' }],
    })

    await app.close()
  })
})
