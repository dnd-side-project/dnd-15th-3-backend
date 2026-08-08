import { NotImplementedException } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { Test } from '@nestjs/testing'
import { PreferenceType } from 'src/course/enums/preference-type.enum'
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
    expect(() =>
      controller.updatePlacePreference('1', '2', {
        preference: PreferenceType.Like,
      }),
    ).toThrow(NotImplementedException)
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
      patch?: { responses?: Record<string, unknown> }
    }

    function responseCodes(responses?: Record<string, unknown>) {
      return Object.keys(responses ?? {}).sort()
    }

    const meetingStatusPath = document.paths?.['/meetings/{meetingId}'] as
      | PathOperations
      | undefined
    expect(responseCodes(meetingStatusPath?.get?.responses)).toEqual(
      ['200', '400', '401', '403', '404', '501'].sort(),
    )

    const mapPinsPath = document.paths?.['/meetings/{meetingId}/places/pins'] as
      | PathOperations
      | undefined
    expect(responseCodes(mapPinsPath?.get?.responses)).toEqual(
      ['200', '400', '401', '403', '404', '501'].sort(),
    )

    const placesPath = document.paths?.['/meetings/{meetingId}/places'] as
      | PathOperations
      | undefined
    expect(responseCodes(placesPath?.get?.responses)).toEqual(
      ['200', '400', '401', '403', '404', '501'].sort(),
    )
    expect(responseCodes(placesPath?.post?.responses)).toEqual(
      ['204', '400', '401', '403', '404', '409', '501'].sort(),
    )

    const preferencePath = document.paths?.[
      '/meetings/{meetingId}/places/{recommendationId}/preference'
    ] as PathOperations | undefined
    expect(responseCodes(preferencePath?.patch?.responses)).toEqual(
      ['200', '400', '401', '403', '404', '409', '501'].sort(),
    )

    type SchemaWithProperties = { properties?: Record<string, unknown> }
    type SchemaWithNullableProperties = {
      properties?: Record<string, { nullable?: boolean }>
    }

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
      ?.MeetingPlaceRecommendationListDto as
      | (SchemaWithProperties & SchemaWithNullableProperties)
      | undefined
    expect(Object.keys(placeListSchema?.properties ?? {})).toEqual([
      'items',
      'totalCount',
      'appliedSort',
      'appliedCategory',
    ])
    expect(placeListSchema?.properties?.appliedCategory?.nullable).toBe(true)

    const placeRecommendationSchema = document.components?.schemas
      ?.MeetingPlaceRecommendationDto as
      | SchemaWithNullableProperties
      | undefined
    expect(placeRecommendationSchema?.properties?.myPreference?.nullable).toBe(
      true,
    )

    const updatePreferenceRequestSchema = document.components?.schemas
      ?.UpdatePlacePreferenceRequestDto as
      | (SchemaWithProperties & SchemaWithNullableProperties)
      | undefined
    expect(
      Object.keys(updatePreferenceRequestSchema?.properties ?? {}),
    ).toEqual(['preference'])
    expect(
      updatePreferenceRequestSchema?.properties?.preference?.nullable,
    ).toBe(true)

    const placePreferenceSchema = document.components?.schemas
      ?.PlacePreferenceResponseDto as
      | (SchemaWithProperties & SchemaWithNullableProperties)
      | undefined
    expect(Object.keys(placePreferenceSchema?.properties ?? {})).toEqual([
      'likeCount',
      'dislikeCount',
      'myPreference',
    ])
    expect(placePreferenceSchema?.properties?.myPreference?.nullable).toBe(true)

    await app.close()
  })
})
