import { Readable } from 'node:stream'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { Test } from '@nestjs/testing'
import { CategorySlug } from 'src/category/enums/category-slug.enum'
import { CommonException } from 'src/common/exception/common.exception'
import { PreferenceType } from 'src/course/enums/preference-type.enum'
import { ProfileAvatarId } from 'src/user/enums/profile-avatar-id.enum'
import { MeetingTypeCode } from './enums/meeting-type-code.enum'
import {
  MeetingController,
  MeetingDetailController,
} from './meeting.controller'
import { MeetingService } from './meeting.service'

function createController() {
  const meetingService = {
    createMeeting: jest.fn().mockResolvedValue({}),
    updateLocation: jest.fn().mockResolvedValue({}),
    addRecommendation: jest.fn().mockResolvedValue({}),
    getRecommendations: jest.fn().mockResolvedValue([]),
    getCoursePlan: jest.fn().mockResolvedValue({}),
    updateCoursePlan: jest.fn().mockResolvedValue({}),
    previewInvitation: jest.fn().mockResolvedValue({}),
    joinMeeting: jest.fn().mockResolvedValue({}),
    getMeetingDetail: jest.fn().mockResolvedValue({}),
    storeCourseImage: jest.fn().mockResolvedValue({}),
    downloadCourseImage: jest.fn().mockResolvedValue({
      body: Readable.from(Buffer.from('image')),
      mimeType: 'image/png',
    }),
  } as unknown as MeetingService

  return {
    controller: new MeetingController(meetingService),
    meetingService,
  }
}

describe('MeetingController', () => {
  it('실제 데이터 연동 전까지 미구현 엔드포인트가 501을 반환한다', () => {
    const { controller } = createController()

    expect(() => controller.getMeetingStatus('1', 'token')).toThrow(
      CommonException,
    )
    expect(() => controller.getMapPins('1', 'token')).toThrow(CommonException)
    expect(() =>
      controller.updatePlacePreference('1', '2', 'token', {
        preference: PreferenceType.Like,
      }),
    ).toThrow(CommonException)
    expect(() => controller.getSimilarPlaces('1', '2', 'token')).toThrow(
      CommonException,
    )
    expect(() =>
      controller.getSimilarPlaces('1', '2', 'token', ['3', '4'], 5),
    ).toThrow(CommonException)
  })

  it('Swagger 문서에 미구현 엔드포인트의 경로와 응답 코드가 포함된다', async () => {
    const moduleFixture = await Test.createTestingModule({
      controllers: [MeetingController],
      providers: [
        {
          provide: MeetingService,
          useValue: {
            createMeeting: jest.fn(),
            updateLocation: jest.fn(),
            addRecommendation: jest.fn(),
            getRecommendations: jest.fn(),
            getCoursePlan: jest.fn(),
            updateCoursePlan: jest.fn(),
            previewInvitation: jest.fn(),
            joinMeeting: jest.fn(),
            storeCourseImage: jest.fn(),
            downloadCourseImage: jest.fn(),
          },
        },
      ],
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
      ['200', '400', '401', '403', '404', '409'].sort(),
    )
    const courseImageDownloadPath = document.paths?.[
      '/meetings/{meetingId}/course-image/download'
    ] as PathOperations | undefined
    expect(responseCodes(courseImageDownloadPath?.get?.responses)).toEqual(
      ['200', '401', '404'].sort(),
    )

    const similarPlacesPath = document.paths?.[
      '/meetings/{meetingId}/places/{placeId}/similar'
    ] as PathOperations | undefined
    expect(responseCodes(similarPlacesPath?.get?.responses)).toEqual(
      ['200', '400', '401', '404', '409', '501'].sort(),
    )

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

    const courseImageResponseSchema = document.components?.schemas
      ?.CourseImageResponseDto as SchemaWithProperties | undefined
    expect(Object.keys(courseImageResponseSchema?.properties ?? {})).toEqual([
      'imageUrl',
      'uploadedAt',
    ])

    const similarPlaceResponseSchema = document.components?.schemas
      ?.SimilarPlaceResponseDto as
      | (SchemaWithProperties & SchemaWithNullableProperties)
      | undefined
    expect(Object.keys(similarPlaceResponseSchema?.properties ?? {})).toEqual([
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
      similarPlaceResponseSchema?.properties?.primaryImageUrl?.nullable,
    ).toBe(true)

    await app.close()
  })

  it('초대·참여·상세·코스 계획 API를 서비스에 전달한다', () => {
    const { controller, meetingService } = createController()
    const profile = {
      userKey: 'device-2',
      nickname: '게스트',
      profileAvatarId: ProfileAvatarId.MomoBlue,
    }

    controller.getCoursePlan('1', 'token')
    controller.updateCoursePlan('1', 'token', {
      categorySlugs: [CategorySlug.Cafe],
      version: 1,
    })
    controller.previewInvitation({ invitationCode: 'abc234' })
    controller.joinMeeting({ invitationCode: 'ABC234', ...profile })
    new MeetingDetailController(meetingService).getMeetingDetail('1', 'token')

    expect(meetingService.getCoursePlan).toHaveBeenCalledWith('1', 'token')
    expect(meetingService.updateCoursePlan).toHaveBeenCalledWith('1', 'token', {
      categorySlugs: [CategorySlug.Cafe],
      version: 1,
    })
    expect(meetingService.previewInvitation).toHaveBeenCalledWith({
      invitationCode: 'ABC234',
    })
    expect(meetingService.joinMeeting).toHaveBeenCalledWith({
      invitationCode: 'ABC234',
      ...profile,
    })
    expect(meetingService.getMeetingDetail).toHaveBeenCalledWith('1', 'token')
  })

  it('방장의 코스 이미지 등록과 모임원의 다운로드를 서비스에 위임한다', async () => {
    const { controller, meetingService } = createController()
    const file = { buffer: Buffer.from('image'), mimetype: 'image/png' }

    await controller.storeCourseImage('1', 'host-token', file)
    const download = await controller.downloadCourseImage('1', 'member-token')

    expect(meetingService.storeCourseImage).toHaveBeenCalledWith(
      '1',
      'host-token',
      file,
    )
    expect(meetingService.downloadCourseImage).toHaveBeenCalledWith(
      '1',
      'member-token',
    )
    expect(download.getHeaders()).toMatchObject({
      type: 'image/png',
      disposition: 'attachment; filename="momo-course.png"',
    })
  })

  it('모임 생성 요청을 검증하고 서비스에 전달한다', () => {
    const { controller, meetingService } = createController()
    const request = {
      meetingTypeCode: MeetingTypeCode.Social,
      name: '성수 모임',
      date: '2026-08-23',
      time: '12:00',
      firstMeetingLocation: {
        displayName: '강남역',
        address: '서울 강남구',
        latitude: 37.4979,
        longitude: 127.0276,
        externalAddressId: 'kakao-address-1',
      },
      categorySlugs: [CategorySlug.Cafe],
      host: {
        userKey: 'device-1',
        nickname: '모모',
        profileAvatarId: ProfileAvatarId.MomoBlue,
      },
    }

    controller.createMeeting(request)

    expect(meetingService.createMeeting).toHaveBeenCalledWith(request)
  })

  it('documents meeting type codes and request shapes for frontend mocking', async () => {
    const moduleFixture = await Test.createTestingModule({
      controllers: [MeetingController, MeetingDetailController],
      providers: [
        {
          provide: MeetingService,
          useValue: {
            createMeeting: jest.fn(),
            updateLocation: jest.fn(),
            addRecommendation: jest.fn(),
            getRecommendations: jest.fn(),
            getCoursePlan: jest.fn(),
            updateCoursePlan: jest.fn(),
            previewInvitation: jest.fn(),
            joinMeeting: jest.fn(),
            getMeetingDetail: jest.fn(),
            storeCourseImage: jest.fn(),
            downloadCourseImage: jest.fn(),
          },
        },
      ],
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
          properties?: Record<string, { nullable?: boolean; type?: string }>
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
    expect(meetingInvitationSchema?.properties).toHaveProperty('locationId')
    expect(meetingScreenSchema?.properties).toHaveProperty('invitationCode')
    expect(meetingScreenSchema?.properties?.courseImageUrl).toMatchObject({
      type: 'string',
      nullable: true,
    })
    expect(meetingScreenSchema?.required).toContain('selectedCourse')
    expect(meetingScreenSchema?.properties?.selectedCourse).toMatchObject({
      nullable: true,
    })

    const meetingsPath = document.paths?.['/meetings'] as
      | { post?: { responses?: Record<string, unknown> } }
      | undefined
    expect(meetingsPath?.post?.responses).toHaveProperty('201')

    await app.close()
  })
})
