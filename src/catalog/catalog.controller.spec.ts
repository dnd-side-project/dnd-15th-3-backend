import {
  BadRequestException,
  NotImplementedException,
  ServiceUnavailableException,
} from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { Test } from '@nestjs/testing'
import { CategorySlug } from 'src/category/enums/category-slug.enum'
import { KakaoLocalService } from 'src/kakao/kakao-local.service'
import { ProfileAvatarId } from 'src/user/enums/profile-avatar-id.enum'
import { CatalogController } from './catalog.controller'

function createController() {
  const kakaoLocal = {
    searchAddressPlaces: jest.fn(),
  }

  return {
    controller: new CatalogController(
      kakaoLocal as unknown as KakaoLocalService,
    ),
    kakaoLocal,
  }
}

describe('CatalogController', () => {
  it('does not provide frontend fixtures for unimplemented catalog APIs', () => {
    const { controller } = createController()

    expect(() => controller.getMeetingTypes()).toThrow(NotImplementedException)
    expect(() => controller.getCategories()).toThrow(NotImplementedException)
    expect(() => controller.getProfileAvatars()).toThrow(
      NotImplementedException,
    )
    expect(() => controller.searchPlaces('성수')).toThrow(
      NotImplementedException,
    )
  })

  it('검색어가 입력될 때마다 카카오 주소 검색을 호출한다', async () => {
    const { controller, kakaoLocal } = createController()
    kakaoLocal.searchAddressPlaces.mockResolvedValue([])

    await controller.searchFirstMeetingPlaces('ㄱ')

    expect(kakaoLocal.searchAddressPlaces).toHaveBeenCalledWith({
      query: 'ㄱ',
      // biome-ignore lint/style/useNamingConvention: 카카오 API 쿼리 파라미터 이름과 동일하게 유지
      analyze_type: 'similar',
      page: 1,
      size: 10,
    })
  })

  it('첫 만남 장소 검색어가 비어 있으면 실패한다', async () => {
    const { controller } = createController()

    await expect(controller.searchFirstMeetingPlaces(' ')).rejects.toThrow(
      BadRequestException,
    )
  })

  it('real mode exposes Kakao key configuration failures as 503', async () => {
    const { controller, kakaoLocal } = createController()
    kakaoLocal.searchAddressPlaces.mockRejectedValue(
      new ServiceUnavailableException(
        '카카오 REST API 키가 설정되지 않았습니다.',
      ),
    )

    await expect(
      controller.searchFirstMeetingPlaces('강남'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException)
  })

  it('documents the frontend contract without mock providers', async () => {
    const moduleFixture = await Test.createTestingModule({
      controllers: [CatalogController],
      providers: [
        {
          provide: KakaoLocalService,
          useValue: { searchAddressPlaces: jest.fn() },
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

    const firstMeetingPlaceSchema = document.components?.schemas
      ?.FirstMeetingPlaceResponseDto as
      | { properties?: Record<string, unknown> }
      | undefined
    expect(Object.keys(firstMeetingPlaceSchema?.properties ?? {})).toEqual([
      'id',
      'name',
      'address',
      'latitude',
      'longitude',
    ])

    const firstMeetingPath = document.paths?.['/places/firstmeeting_search'] as
      | { get?: { responses?: Record<string, unknown> } }
      | undefined
    expect(firstMeetingPath?.get?.responses).toHaveProperty('200')
    expect(firstMeetingPath?.get?.responses).toHaveProperty('503')

    const meetingTypesPath = document.paths?.['/meeting-types'] as
      | { get?: { responses?: Record<string, unknown> } }
      | undefined
    expect(meetingTypesPath?.get?.responses).toHaveProperty('501')

    await app.close()
  })
})
