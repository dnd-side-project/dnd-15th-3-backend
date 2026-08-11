import { NotImplementedException } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { Test } from '@nestjs/testing'
import { ParticipantRole } from 'src/meeting/enums/participant-role.enum'
import { ProfileAvatarId } from 'src/user/enums/profile-avatar-id.enum'
import { CourseController } from './course.controller'
import { CourseService } from './course.service'

function createController() {
  const courseService = {
    getCourseCandidates: jest.fn().mockResolvedValue({}),
    getCourseComments: jest.fn().mockResolvedValue([]),
  } as unknown as CourseService

  return {
    controller: new CourseController(courseService),
    courseService,
  }
}

describe('CourseController', () => {
  it('코스 후보 목록 조회는 CourseService에 위임한다', async () => {
    const { controller, courseService } = createController()
    const expected = {
      courseCandidates: [{ courseCandidateId: '1', order: 1 }],
      totalCount: 1,
    }
    ;(courseService.getCourseCandidates as jest.Mock).mockResolvedValue(
      expected,
    )

    await expect(controller.getCourseCandidates('1', 'token')).resolves.toEqual(
      expected,
    )
    expect(courseService.getCourseCandidates).toHaveBeenCalledWith('1', 'token')
  })

  it('코스 댓글 목록 조회는 CourseService에 위임한다', async () => {
    const { controller, courseService } = createController()
    const expected = [
      {
        commentId: '1',
        nickname: '모모',
        profileAvatarId: ProfileAvatarId.MomoBlue,
        authorRole: ParticipantRole.Host,
        isMine: true,
        content: '여기 코스 좋아요!',
        createdAt: '2026-08-08T12:34:56.000Z',
      },
    ]
    ;(courseService.getCourseComments as jest.Mock).mockResolvedValue(expected)

    await expect(
      controller.getCourseComments('1', '2', 'token'),
    ).resolves.toEqual(expected)
    expect(courseService.getCourseComments).toHaveBeenCalledWith(
      '1',
      '2',
      'token',
    )
  })

  it('실제 데이터 연동 전까지 나머지 엔드포인트가 501을 반환한다', () => {
    const { controller } = createController()

    expect(() => controller.generateCourse('1', 'token')).toThrow(
      NotImplementedException,
    )
    expect(() => controller.getCourseDetail('1', '2', 'token')).toThrow(
      NotImplementedException,
    )
    expect(() =>
      controller.createCourseComment('1', '2', 'token', { content: '좋아요!' }),
    ).toThrow(NotImplementedException)
    expect(() => controller.getExcludedPlaces('1', '2', 'token')).toThrow(
      NotImplementedException,
    )
    expect(() => controller.confirmCourse('1', '2', 'token', {})).toThrow(
      NotImplementedException,
    )
    expect(() =>
      controller.addCoursePlace('1', '2', 'token', { recommendationId: '3' }),
    ).toThrow(NotImplementedException)
  })

  it('Swagger 문서에 모든 경로와 응답 코드가 포함된다', async () => {
    const moduleFixture = await Test.createTestingModule({
      controllers: [CourseController],
      providers: [
        {
          provide: CourseService,
          useValue: {
            getCourseCandidates: jest.fn(),
            getCourseComments: jest.fn(),
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
    }

    function responseCodes(responses?: Record<string, unknown>) {
      return Object.keys(responses ?? {}).sort()
    }

    const coursesPath = document.paths?.['/meetings/{meetingId}/courses'] as
      | PathOperations
      | undefined
    expect(responseCodes(coursesPath?.post?.responses)).toEqual(
      ['202', '400', '401', '403', '404', '409', '422', '501'].sort(),
    )
    expect(responseCodes(coursesPath?.get?.responses)).toEqual(
      ['200', '400', '401', '404', '409', '500'].sort(),
    )

    const courseDetailPath = document.paths?.[
      '/meetings/{meetingId}/courses/{courseCandidateId}'
    ] as PathOperations | undefined
    expect(responseCodes(courseDetailPath?.get?.responses)).toEqual(
      ['200', '400', '401', '404', '409', '501'].sort(),
    )

    const courseCommentsPath = document.paths?.[
      '/meetings/{meetingId}/courses/{courseCandidateId}/comments'
    ] as PathOperations | undefined
    expect(responseCodes(courseCommentsPath?.get?.responses)).toEqual(
      ['200', '400', '401', '404', '409'].sort(),
    )
    expect(responseCodes(courseCommentsPath?.post?.responses)).toEqual(
      ['201', '400', '401', '404', '409', '501'].sort(),
    )

    const excludedPlacesPath = document.paths?.[
      '/meetings/{meetingId}/courses/{courseCandidateId}/excluded-places'
    ] as PathOperations | undefined
    expect(responseCodes(excludedPlacesPath?.get?.responses)).toEqual(
      ['200', '400', '401', '404', '409', '501'].sort(),
    )

    const confirmationPath = document.paths?.[
      '/meetings/{meetingId}/courses/{courseCandidateId}/confirmation'
    ] as PathOperations | undefined
    expect(responseCodes(confirmationPath?.post?.responses)).toEqual(
      ['200', '400', '401', '403', '404', '409', '501'].sort(),
    )

    const coursePlacesPath = document.paths?.[
      '/meetings/{meetingId}/courses/{courseCandidateId}/places'
    ] as PathOperations | undefined
    expect(responseCodes(coursePlacesPath?.post?.responses)).toEqual(
      ['201', '400', '401', '403', '404', '409', '501'].sort(),
    )

    type SchemaWithProperties = { properties?: Record<string, unknown> }
    type SchemaWithLengthProperties = {
      properties?: Record<string, { minLength?: number; maxLength?: number }>
    }
    type SchemaWithNullableProperties = {
      properties?: Record<string, { nullable?: boolean }>
    }

    const courseListSchema = document.components?.schemas
      ?.CourseCandidateListResponseDto as SchemaWithProperties | undefined
    expect(Object.keys(courseListSchema?.properties ?? {})).toEqual([
      'courseCandidates',
      'totalCount',
    ])

    const courseSummarySchema = document.components?.schemas
      ?.CourseCandidateSummaryDto as SchemaWithProperties | undefined
    expect(Object.keys(courseSummarySchema?.properties ?? {})).toEqual([
      'courseCandidateId',
      'order',
    ])

    const courseDetailSchema = document.components?.schemas
      ?.CourseDetailResponseDto as SchemaWithProperties | undefined
    expect(Object.keys(courseDetailSchema?.properties ?? {})).toEqual([
      'courseName',
      'totalDistanceKm',
      'totalCount',
      'route',
    ])

    const routeStepSchema = document.components?.schemas?.CourseRouteStepDto as
      | (SchemaWithProperties & SchemaWithNullableProperties)
      | undefined
    expect(Object.keys(routeStepSchema?.properties ?? {})).toEqual([
      'recommendationId',
      'placeId',
      'order',
      'name',
      'category',
      'categorySlug',
      'address',
      'primaryImageUrl',
      'longitude',
      'latitude',
      'walkDurationToNextMin',
    ])
    expect(routeStepSchema?.properties?.walkDurationToNextMin?.nullable).toBe(
      true,
    )

    const commentSchema = document.components?.schemas?.CourseCommentDto as
      | SchemaWithProperties
      | undefined
    expect(Object.keys(commentSchema?.properties ?? {})).toEqual([
      'commentId',
      'nickname',
      'profileAvatarId',
      'authorRole',
      'isMine',
      'content',
      'createdAt',
    ])

    const createCommentResponseSchema = document.components?.schemas
      ?.CreateCourseCommentResponseDto as SchemaWithProperties | undefined
    expect(Object.keys(createCommentResponseSchema?.properties ?? {})).toEqual([
      'commentId',
      'content',
      'createdAt',
    ])

    const createCommentRequestSchema = document.components?.schemas
      ?.CreateCourseCommentRequestDto as
      | (SchemaWithProperties & SchemaWithLengthProperties)
      | undefined
    expect(Object.keys(createCommentRequestSchema?.properties ?? {})).toEqual([
      'content',
    ])
    expect(createCommentRequestSchema?.properties?.content?.minLength).toBe(1)
    expect(createCommentRequestSchema?.properties?.content?.maxLength).toBe(300)

    const excludedPlaceListSchema = document.components?.schemas
      ?.ExcludedPlaceListResponseDto as
      | (SchemaWithProperties & SchemaWithNullableProperties)
      | undefined
    expect(Object.keys(excludedPlaceListSchema?.properties ?? {})).toEqual([
      'items',
      'totalCount',
      'appliedCategory',
    ])
    expect(excludedPlaceListSchema?.properties?.appliedCategory?.nullable).toBe(
      true,
    )

    const addCoursePlaceRequestSchema = document.components?.schemas
      ?.AddCoursePlaceRequestDto as SchemaWithProperties | undefined
    expect(Object.keys(addCoursePlaceRequestSchema?.properties ?? {})).toEqual([
      'recommendationId',
    ])

    await app.close()
  })
})
