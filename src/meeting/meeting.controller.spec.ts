import { NotImplementedException } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { Test } from '@nestjs/testing'
import { CategorySlug } from 'src/category/enums/category-slug.enum'
import { ProfileAvatarId } from 'src/user/enums/profile-avatar-id.enum'
import { MeetingTypeCode } from './enums/meeting-type-code.enum'
import {
  MeetingController,
  MeetingDetailController,
} from './meeting.controller'

describe('MeetingController', () => {
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
