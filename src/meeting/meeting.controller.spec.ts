import { NotImplementedException } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { Test } from '@nestjs/testing'
import { CategorySlug } from 'src/category/enums/category-slug.enum'
import { PreferenceType } from 'src/course/enums/preference-type.enum'
import { PlaceSortOption } from 'src/place/enums/place-sort-option.enum'
import { ProfileAvatarId } from 'src/user/enums/profile-avatar-id.enum'
import { MeetingTypeCode } from './enums/meeting-type-code.enum'
import {
  MeetingController,
  MeetingDetailController,
} from './meeting.controller'

function createController() {
  return new MeetingController()
}

describe('MeetingController', () => {
  it('실제 데이터 연동 전까지 모든 엔드포인트가 501을 반환한다', () => {
    const controller = createController()

    expect(() => controller.getMeetingStatus('1', 'token')).toThrow(
      NotImplementedException,
    )
    expect(() => controller.getMapPins('1', 'token')).toThrow(
      NotImplementedException,
    )
    expect(() => controller.getPlaces('1', 'token')).toThrow(
      NotImplementedException,
    )
    expect(() => controller.addPlace('1', 'token', { placeId: '2' })).toThrow(
      NotImplementedException,
    )
    expect(() =>
      controller.updatePlacePreference('1', '2', 'token', {
        preference: PreferenceType.Like,
      }),
    ).toThrow(NotImplementedException)
    expect(() =>
      controller.updateCourseImage('1', 'token', {
        courseImageKey: 'course-cards/1/5.png',
      }),
    ).toThrow(NotImplementedException)
    expect(() => controller.getSimilarPlaces('1', '2', 'token')).toThrow(
      NotImplementedException,
    )
    expect(() =>
      controller.getSimilarPlaces('1', '2', 'token', ['3', '4'], 5),
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
      put?: { responses?: Record<string, unknown> }
    }

    function responseCodes(responses?: Record<string, unknown>) {
      return Object.keys(responses ?? {}).sort()
    }

    const meetingStatusPath = document.paths?.['/meetings/{meetingId}'] as
      | PathOperations
      | undefined
    expect(responseCodes(meetingStatusPath?.get?.responses)).toEqual(
      ['200', '400', '401', '404', '501'].sort(),
    )

    const mapPinsPath = document.paths?.['/meetings/{meetingId}/places/pins'] as
      | PathOperations
      | undefined
    expect(responseCodes(mapPinsPath?.get?.responses)).toEqual(
      ['200', '400', '401', '404', '409', '501'].sort(),
    )

    const placesPath = document.paths?.['/meetings/{meetingId}/places'] as
      | PathOperations
      | undefined
    expect(responseCodes(placesPath?.get?.responses)).toEqual(
      ['200', '400', '401', '404', '409', '501'].sort(),
    )
    expect(responseCodes(placesPath?.post?.responses)).toEqual(
      ['201', '400', '401', '404', '409', '501'].sort(),
    )

    const preferencePath = document.paths?.[
      '/meetings/{meetingId}/places/{recommendationId}/preference'
    ] as PathOperations | undefined
    expect(responseCodes(preferencePath?.patch?.responses)).toEqual(
      ['200', '400', '401', '404', '409', '501'].sort(),
    )

    const courseImagePath = document.paths?.[
      '/meetings/{meetingId}/course-image'
    ] as PathOperations | undefined
    expect(responseCodes(courseImagePath?.put?.responses)).toEqual(
      ['204', '400', '401', '403', '404', '409', '501'].sort(),
    )

    const similarPlacesPath = document.paths?.[
      '/meetings/{meetingId}/places/{placeId}/similar'
    ] as PathOperations | undefined
    expect(responseCodes(similarPlacesPath?.get?.responses)).toEqual(
      ['200', '400', '401', '404', '409', '501'].sort(),
    )

    expect(document.components?.schemas?.PlaceSortOption).toMatchObject({
      enum: Object.values(PlaceSortOption),
    })
    expect(document.components?.schemas?.PreferenceType).toMatchObject({
      enum: Object.values(PreferenceType),
    })

    type SchemaWithProperties = { properties?: Record<string, unknown> }
    type SchemaWithNullableProperties = {
      properties?: Record<string, { nullable?: boolean }>
    }

    const statusSchema = document.components?.schemas
      ?.MeetingStatusResponseDto as
      | (SchemaWithProperties & SchemaWithNullableProperties)
      | undefined
    expect(Object.keys(statusSchema?.properties ?? {})).toEqual([
      'status',
      'confirmedCourseCandidateId',
    ])
    expect(statusSchema?.properties?.confirmedCourseCandidateId?.nullable).toBe(
      true,
    )

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

    const updateCourseImageRequestSchema = document.components?.schemas
      ?.UpdateCourseImageRequestDto as SchemaWithProperties | undefined
    expect(
      Object.keys(updateCourseImageRequestSchema?.properties ?? {}),
    ).toEqual(['courseImageKey'])

    const placeSearchResponseSchema = document.components?.schemas
      ?.PlaceSearchResponseDto as
      | (SchemaWithProperties & SchemaWithNullableProperties)
      | undefined
    expect(Object.keys(placeSearchResponseSchema?.properties ?? {})).toEqual([
      'id',
      'categoryId',
      'name',
      'address',
      'latitude',
      'longitude',
      'primaryImageUrl',
      'previewUrl',
    ])
    expect(
      placeSearchResponseSchema?.properties?.primaryImageUrl?.nullable,
    ).toBe(true)

    await app.close()
  })

  it('does not provide frontend fixtures for unimplemented meeting APIs', () => {
    const controller = new MeetingController()

    expect(() => controller.createMeeting({} as never)).toThrow(
      NotImplementedException,
    )
    expect(() => controller.getCoursePlan('1', 'token')).toThrow(
      NotImplementedException,
    )
    expect(() =>
      controller.updateCoursePlan('1', 'token', {} as never),
    ).toThrow(NotImplementedException)
    expect(() => controller.previewInvitation({} as never)).toThrow(
      NotImplementedException,
    )
    expect(() => controller.joinMeeting({} as never)).toThrow(
      NotImplementedException,
    )
    expect(() =>
      new MeetingDetailController().getMeetingDetail('1', 'token'),
    ).toThrow(NotImplementedException)
  })

  it('documents meeting type codes and request shapes for frontend mocking', async () => {
    const moduleFixture = await Test.createTestingModule({
      controllers: [MeetingController, MeetingDetailController],
    }).compile()
    const app = moduleFixture.createNestApplication()
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().build(),
    )
    const schema = document.components?.schemas?.CreateMeetingDto as
      | {
          properties?: Record<string, { enum?: string[] }>
        }
      | undefined
    const enumSchema = document.components?.schemas?.MeetingTypeCode as
      | { enum?: string[] }
      | undefined
    const coursePlanSchema = document.components?.schemas
      ?.UpdateCoursePlanDto as
      | {
          properties?: Record<string, unknown>
        }
      | undefined
    const invitationPreviewSchema = document.components?.schemas
      ?.InvitationPreviewRequestDto as
      | {
          properties?: Record<string, unknown>
        }
      | undefined
    const joinMeetingSchema = document.components?.schemas?.JoinMeetingDto as
      | {
          properties?: Record<string, unknown>
        }
      | undefined
    const meetingInvitationSchema = document.components?.schemas
      ?.MeetingInvitationResponseDto as
      | {
          properties?: Record<string, unknown>
        }
      | undefined
    const meetingScreenSchema = document.components?.schemas
      ?.MeetingScreenResponseDto as
      | {
          properties?: Record<string, { nullable?: boolean }>
          required?: string[]
        }
      | undefined

    expect(enumSchema?.enum).toEqual(Object.values(MeetingTypeCode))
    expect(schema?.properties?.meetingTypeCode).toMatchObject({
      allOf: [{ $ref: '#/components/schemas/MeetingTypeCode' }],
    })
    expect(schema?.properties?.host).toMatchObject({
      allOf: [{ $ref: '#/components/schemas/ParticipantProfileDto' }],
    })
    expect(document.components?.schemas?.CategorySlug).toMatchObject({
      enum: Object.values(CategorySlug),
    })
    expect(coursePlanSchema?.properties?.categorySlugs).toMatchObject({
      type: 'array',
      items: { $ref: '#/components/schemas/CategorySlug' },
    })
    expect(schema?.properties?.categorySlugs).not.toHaveProperty('uniqueItems')
    expect(coursePlanSchema?.properties?.categorySlugs).not.toHaveProperty(
      'uniqueItems',
    )
    expect(document.components?.schemas?.ProfileAvatarId).toMatchObject({
      enum: Object.values(ProfileAvatarId),
    })
    expect(invitationPreviewSchema?.properties).toHaveProperty('invitationCode')
    expect(invitationPreviewSchema?.properties).not.toHaveProperty(
      'accessToken',
    )
    expect(joinMeetingSchema?.properties).toHaveProperty('invitationCode')
    expect(joinMeetingSchema?.properties).not.toHaveProperty('accessToken')
    expect(meetingInvitationSchema?.properties).toHaveProperty('invitationCode')
    expect(meetingInvitationSchema?.properties).toHaveProperty('place')
    expect(meetingScreenSchema?.properties).toHaveProperty('invitationCode')
    expect(meetingScreenSchema?.required).toContain('selectedCourse')
    expect(meetingScreenSchema?.properties?.selectedCourse).toMatchObject({
      nullable: true,
    })

    const meetingsPath = document.paths?.['/meetings'] as
      | { post?: { responses?: Record<string, unknown> } }
      | undefined
    expect(meetingsPath?.post?.responses).toHaveProperty('501')

    await app.close()
  })
})
