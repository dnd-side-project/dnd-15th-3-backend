import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { Test } from '@nestjs/testing'
import { CategorySlug } from 'src/category/enums/category-slug.enum'
import { ProfileAvatarId } from 'src/user/enums/profile-avatar-id.enum'
import { CatalogController } from './catalog.controller'
import { CatalogService } from './catalog.service'

function createController() {
  const catalogService = {
    getMeetingTypes: jest.fn().mockResolvedValue([]),
    getCategories: jest.fn().mockResolvedValue([]),
    getProfileAvatars: jest.fn().mockReturnValue([]),
  }

  return {
    controller: new CatalogController(
      catalogService as unknown as CatalogService,
    ),
    catalogService,
  }
}

describe('CatalogController', () => {
  it('카탈로그 조회를 서비스에 위임한다', () => {
    const { controller, catalogService } = createController()

    controller.getMeetingTypes()
    controller.getCategories()
    controller.getProfileAvatars()

    expect(catalogService.getMeetingTypes).toHaveBeenCalled()
    expect(catalogService.getCategories).toHaveBeenCalled()
    expect(catalogService.getProfileAvatars).toHaveBeenCalled()
  })

  it('documents the frontend contract without mock providers', async () => {
    const moduleFixture = await Test.createTestingModule({
      controllers: [CatalogController],
      providers: [
        {
          provide: CatalogService,
          useValue: {
            getMeetingTypes: jest.fn(),
            getCategories: jest.fn(),
            getProfileAvatars: jest.fn(),
          },
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
    const avatarSchema = document.components?.schemas
      ?.ProfileAvatarResponseDto as
      | {
          properties?: Record<string, unknown>
        }
      | undefined
    const avatarEnumSchema = document.components?.schemas?.ProfileAvatarId as
      | { enum?: string[] }
      | undefined

    expect(enumSchema?.enum).toEqual(Object.values(CategorySlug))
    expect(schema?.properties?.slug).toMatchObject({
      allOf: [{ $ref: '#/components/schemas/CategorySlug' }],
    })
    expect(avatarEnumSchema?.enum).toEqual(Object.values(ProfileAvatarId))
    expect(avatarSchema?.properties?.id).toMatchObject({
      allOf: [{ $ref: '#/components/schemas/ProfileAvatarId' }],
    })
    expect(Object.keys(avatarSchema?.properties ?? {})).toEqual(['id', 'name'])

    const meetingTypesPath = document.paths?.['/meeting-types'] as
      | { get?: { responses?: Record<string, unknown> } }
      | undefined
    expect(meetingTypesPath?.get?.responses).toHaveProperty('200')

    await app.close()
  })
})
