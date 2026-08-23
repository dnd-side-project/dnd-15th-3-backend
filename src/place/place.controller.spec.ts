import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { Test } from '@nestjs/testing'
import { CommonException } from 'src/common/exception/common.exception'
import { KakaoLocalService } from 'src/kakao/kakao-local.service'
import { PlaceController } from './place.controller'
import { PlaceService } from './place.service'

describe('PlaceController', () => {
  it('장소 상세 조회를 서비스에 위임한다', async () => {
    const placeService = {
      getPlaceDetail: jest.fn().mockResolvedValue({ placeId: '1' }),
    }
    const kakaoLocal = { searchKeywordPlaces: jest.fn() }
    const controller = new PlaceController(
      placeService as unknown as PlaceService,
      kakaoLocal as unknown as KakaoLocalService,
    )

    await expect(
      controller.getPlaceDetail('1', 'token'),
    ).resolves.toMatchObject({ placeId: '1' })
    expect(placeService.getPlaceDetail).toHaveBeenCalledWith('1', 'token')
  })

  it('Swagger 문서에 모든 응답 코드와 응답 스키마가 포함된다', async () => {
    const moduleFixture = await Test.createTestingModule({
      controllers: [PlaceController],
      providers: [
        {
          provide: PlaceService,
          useValue: { searchPlaces: jest.fn(), getPlaceDetail: jest.fn() },
        },
        {
          provide: KakaoLocalService,
          useValue: { searchKeywordPlaces: jest.fn() },
        },
      ],
    }).compile()
    const app = moduleFixture.createNestApplication()
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().build(),
    )

    const placeDetailPath = document.paths?.['/places/{placeId}'] as
      | {
          get?: {
            parameters?: Array<{ name?: string }>
            responses?: Record<string, unknown>
          }
        }
      | undefined
    expect(placeDetailPath?.get?.responses).toHaveProperty('200')
    expect(placeDetailPath?.get?.responses).toHaveProperty('400')
    expect(placeDetailPath?.get?.responses).toHaveProperty('401')
    expect(placeDetailPath?.get?.responses).toHaveProperty('404')
    expect(placeDetailPath?.get?.parameters?.map(({ name }) => name)).toEqual([
      'placeId',
      'accessToken',
    ])

    type SchemaWithProperties = {
      properties?: Record<string, { type?: string; nullable?: boolean }>
    }
    const schema = document.components?.schemas?.PlaceSearchResultDto as
      | SchemaWithProperties
      | undefined
    expect(Object.keys(schema?.properties ?? {})).toEqual(
      expect.arrayContaining(['placeId', 'category', 'name', 'address']),
    )
    expect(schema?.properties?.imageUrls?.type).toBe('array')
    expect(schema?.properties?.imageUrls?.nullable).not.toBe(true)

    await app.close()
  })

  it('검색 요청을 검증하고 기본 페이지 값을 서비스에 전달한다', () => {
    const placeService = {
      searchPlaces: jest.fn().mockResolvedValue({ items: [] }),
    }
    const kakaoLocal = { searchKeywordPlaces: jest.fn() }
    const controller = new PlaceController(
      placeService as unknown as PlaceService,
      kakaoLocal as unknown as KakaoLocalService,
    )

    controller.search({ meetingId: '123', accessToken: 'token' })

    expect(placeService.searchPlaces).toHaveBeenCalledWith({
      meetingId: '123',
      accessToken: 'token',
      page: 1,
      size: 20,
    })
  })

  it('참여자 토큰이 없으면 외부나 DB 조회 없이 실패한다', () => {
    const placeService = { searchPlaces: jest.fn() }
    const controller = new PlaceController(
      placeService as unknown as PlaceService,
      { searchKeywordPlaces: jest.fn() } as unknown as KakaoLocalService,
    )

    expect(() => controller.search({ meetingId: '123' })).toThrow(
      CommonException,
    )
    expect(placeService.searchPlaces).not.toHaveBeenCalled()
  })

  it('첫 만남 위치 검색은 Kakao 키워드 서비스에 위임한다', async () => {
    const kakaoLocal = { searchKeywordPlaces: jest.fn().mockResolvedValue([]) }
    const controller = new PlaceController(
      { searchPlaces: jest.fn() } as unknown as PlaceService,
      kakaoLocal as unknown as KakaoLocalService,
    )

    await controller.searchFirstMeetingPlaces('강남역 2번출구')

    expect(kakaoLocal.searchKeywordPlaces).toHaveBeenCalledWith({
      query: '강남역 2번출구',
      page: 1,
      size: 10,
    })
  })
})
