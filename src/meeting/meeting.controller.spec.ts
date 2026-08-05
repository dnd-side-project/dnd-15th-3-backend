import { NotFoundException } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { Test } from '@nestjs/testing'
import { CategorySlug } from 'src/category/enums/category-slug.enum'
import { MockApiService } from 'src/mock/mock-api.service'
import { MeetingTypeCode } from './enums/meeting-type-code.enum'
import { MeetingController } from './meeting.controller'

function createController(joinResult: unknown) {
  const mockApi = {
    requireEnabled: jest.fn(),
    joinMeeting: jest.fn().mockReturnValue(joinResult),
  } as unknown as MockApiService

  return { controller: new MeetingController(mockApi), mockApi }
}

describe('MeetingController', () => {
  it('passes the invitation token to the join service', () => {
    const { controller, mockApi } = createController({ id: '1' })
    const joinMeeting = controller.joinMeeting.bind(controller) as (dto: {
      accessToken: string
    }) => unknown

    joinMeeting({ accessToken: 'DNDFOR' })

    expect(mockApi.joinMeeting).toHaveBeenCalledWith('DNDFOR')
  })

  it('returns not found when the invitation token is invalid', () => {
    const { controller } = createController(undefined)
    const joinMeeting = controller.joinMeeting.bind(controller) as (dto: {
      accessToken: string
    }) => unknown

    expect(() => joinMeeting({ accessToken: 'INVALID' })).toThrow(
      NotFoundException,
    )
  })

  it('documents meeting type codes as a Swagger enum', async () => {
    const moduleFixture = await Test.createTestingModule({
      controllers: [MeetingController],
      providers: [
        {
          provide: MockApiService,
          useValue: { requireEnabled: jest.fn(), createMeeting: jest.fn() },
        },
      ],
    }).compile()
    const app = moduleFixture.createNestApplication()
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().addBearerAuth().build(),
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

    expect(enumSchema?.enum).toEqual(Object.values(MeetingTypeCode))
    expect(schema?.properties?.meetingTypeCode).toMatchObject({
      allOf: [{ $ref: '#/components/schemas/MeetingTypeCode' }],
    })
    expect(document.components?.schemas?.CategorySlug).toMatchObject({
      enum: Object.values(CategorySlug),
    })
    expect(coursePlanSchema?.properties?.categorySlugs).toMatchObject({
      type: 'array',
      items: { $ref: '#/components/schemas/CategorySlug' },
    })
    expect(
      document.paths?.['/meetings/{meetingId}/course-plan']?.get,
    ).toMatchObject({
      security: [{ bearer: [] }],
    })
    expect(
      document.paths?.['/meetings/{meetingId}/course-plan']?.get?.parameters,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'accessToken',
          deprecated: true,
          required: false,
        }),
      ]),
    )

    await app.close()
  })
})
