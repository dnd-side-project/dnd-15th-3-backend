import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { Test } from '@nestjs/testing'
import { CategorySlug } from 'src/category/enums/category-slug.enum'
import { ProfileAvatarId } from 'src/user/enums/profile-avatar-id.enum'
import { MeetingTypeCode } from './enums/meeting-type-code.enum'
import {
  MeetingController,
  MeetingDetailController,
} from './meeting.controller'
import { MeetingService } from './meeting.service'

describe('MeetingController', () => {
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
    } as unknown as MeetingService

    return {
      controller: new MeetingController(meetingService),
      meetingService,
    }
  }

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
    expect(meetingInvitationSchema?.properties).toHaveProperty('locationId')
    expect(meetingScreenSchema?.properties).toHaveProperty('invitationCode')
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
