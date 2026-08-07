import { NotImplementedException } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { Test } from '@nestjs/testing'
import { MeetingController } from './meeting.controller'

function createController() {
  return new MeetingController()
}

describe('MeetingController', () => {
  it('실제 데이터 연동 전까지 모든 엔드포인트가 501을 반환한다', () => {
    const controller = createController()

    expect(() => controller.getMeetingStatus('1')).toThrow(
      NotImplementedException,
    )
    expect(() => controller.getMapPins('1')).toThrow(NotImplementedException)
    expect(() => controller.getPlaces('1')).toThrow(NotImplementedException)
    expect(() => controller.addPlace('1', { placeId: '2' })).toThrow(
      NotImplementedException,
    )
  })

  it('Swagger 문서에 모든 경로와 응답 코드가 포함된다', async () => {
    const moduleFixture = await Test.createTestingModule({
      controllers: [MeetingController],
    }).compile()
    const app = moduleFixture.createNestApplication()
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().build(),
    )

    type PathOperations = {
      get?: { responses?: Record<string, unknown> }
      post?: { responses?: Record<string, unknown> }
    }

    const meetingStatusPath = document.paths?.[
      '/api/v1/meetings/{meetingId}'
    ] as PathOperations | undefined
    expect(meetingStatusPath?.get?.responses).toHaveProperty('200')
    expect(meetingStatusPath?.get?.responses).toHaveProperty('400')
    expect(meetingStatusPath?.get?.responses).toHaveProperty('401')
    expect(meetingStatusPath?.get?.responses).toHaveProperty('403')
    expect(meetingStatusPath?.get?.responses).toHaveProperty('404')
    expect(meetingStatusPath?.get?.responses).toHaveProperty('501')

    const mapPinsPath = document.paths?.[
      '/api/v1/meetings/{meetingId}/places/pins'
    ] as PathOperations | undefined
    expect(mapPinsPath?.get?.responses).toHaveProperty('200')
    expect(mapPinsPath?.get?.responses).toHaveProperty('400')
    expect(mapPinsPath?.get?.responses).toHaveProperty('401')
    expect(mapPinsPath?.get?.responses).toHaveProperty('403')
    expect(mapPinsPath?.get?.responses).toHaveProperty('404')
    expect(mapPinsPath?.get?.responses).toHaveProperty('501')

    const placesPath = document.paths?.[
      '/api/v1/meetings/{meetingId}/places'
    ] as PathOperations | undefined
    expect(placesPath?.get?.responses).toHaveProperty('200')
    expect(placesPath?.get?.responses).toHaveProperty('400')
    expect(placesPath?.get?.responses).toHaveProperty('401')
    expect(placesPath?.get?.responses).toHaveProperty('403')
    expect(placesPath?.get?.responses).toHaveProperty('404')
    expect(placesPath?.get?.responses).toHaveProperty('501')

    expect(placesPath?.post?.responses).toHaveProperty('204')
    expect(placesPath?.post?.responses).toHaveProperty('400')
    expect(placesPath?.post?.responses).toHaveProperty('401')
    expect(placesPath?.post?.responses).toHaveProperty('403')
    expect(placesPath?.post?.responses).toHaveProperty('404')
    expect(placesPath?.post?.responses).toHaveProperty('409')
    expect(placesPath?.post?.responses).toHaveProperty('501')

    type SchemaWithProperties = { properties?: Record<string, unknown> }

    const statusSchema = document.components?.schemas
      ?.MeetingStatusResponseDto as SchemaWithProperties | undefined
    expect(Object.keys(statusSchema?.properties ?? {})).toEqual(['status'])

    const mapPinsSchema = document.components?.schemas?.MapPinsResponseDto as
      | SchemaWithProperties
      | undefined
    expect(Object.keys(mapPinsSchema?.properties ?? {})).toEqual(
      expect.arrayContaining(['startPlace', 'sharedPlaces']),
    )

    const addPlaceRequestSchema = document.components?.schemas
      ?.AddPlaceRequestDto as SchemaWithProperties | undefined
    expect(Object.keys(addPlaceRequestSchema?.properties ?? {})).toEqual([
      'placeId',
    ])

    const placeListSchema = document.components?.schemas
      ?.MeetingPlaceRecommendationListDto as SchemaWithProperties | undefined
    expect(Object.keys(placeListSchema?.properties ?? {})).toEqual([
      'items',
      'totalCount',
      'appliedSort',
      'appliedCategory',
    ])

    await app.close()
  })
})
