import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common'
import {
  ApiAcceptedResponse,
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger'
import { MAX_COURSE_STEPS } from 'src/category/category.constants'
import { CategorySlug } from 'src/category/enums/category-slug.enum'
import { ApiErrorResponse } from 'src/common/decorators/api-error-response.decorator'
import { CommonException } from 'src/common/exception/common.exception'
import { CommonErrorCode } from 'src/common/exception/common-error-code'
import { BigIntStringPipe } from 'src/common/pipes/bigint-string.pipe'
import { MeetingStatusResponseDto } from 'src/meeting/dto/meeting-status-response.dto'
import { AddCoursePlaceRequestDto } from './dto/add-course-place-request.dto'
import { ConfirmCourseRequestDto } from './dto/confirm-course-request.dto'
import { CourseCandidateListResponseDto } from './dto/course-candidate-list-response.dto'
import { CourseCommentDto } from './dto/course-comment.dto'
import { CourseDetailResponseDto } from './dto/course-detail-response.dto'
import { CreateCourseCommentRequestDto } from './dto/create-course-comment-request.dto'
import { CreateCourseCommentResponseDto } from './dto/create-course-comment-response.dto'
import { ExcludedPlaceListResponseDto } from './dto/excluded-place-list-response.dto'
import { UpdateCoursePlacesRequestDto } from './dto/update-course-places-request.dto'

@ApiTags('코스')
@Controller('meetings')
export class CourseController {
  @Post(':meetingId/courses')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiParam({
    name: 'meetingId',
    description: '모임 ID',
    schema: { type: 'string', example: '1', pattern: '^\\d+$' },
  })
  @ApiQuery({
    name: 'accessToken',
    description: 'AI 코스 생성을 요청할 방장의 참여자 전용 재접속 토큰',
    example: 'host-session-token',
    required: true,
  })
  @ApiOperation({
    summary: 'AI 코스 생성',
    description:
      'AI를 이용해 모임에 추가된 장소 추천을 기반으로 코스 생성을 요청합니다. ' +
      '코스 순서 기준으로 각 카테고리를 채울 장소가 확보되어 있는지 먼저 확인합니다. ' +
      '요청이 접수되면 모임 상태가 코스 생성 중으로 즉시 전환되고, ' +
      '이후 모임 상태 조회 API로 완료 또는 실패 여부를 확인할 수 있습니다. ' +
      'AI 코스 생성에 실패하면 내부 로직으로 경로를 직접 생성하는 방식으로 재시도하며, ' +
      '이 경우에도 생성에 실패할 수 있습니다. ' +
      '방장만 호출할 수 있고, 모임이 장소 추천 수집 중이거나 코스 생성 실패 상태일 때만 호출할 수 있습니다.',
  })
  @ApiAcceptedResponse({
    description: '코스 생성 요청이 접수되어 처리 중입니다.',
    type: MeetingStatusResponseDto,
  })
  @ApiBadRequestResponse({ description: 'meetingId 형식이 올바르지 않습니다.' })
  @ApiUnauthorizedResponse({
    description: 'accessToken이 없거나 유효하지 않습니다.',
  })
  @ApiForbiddenResponse({ description: '방장이 아닙니다.' })
  @ApiNotFoundResponse({ description: '모임을 찾을 수 없습니다.' })
  @ApiUnprocessableEntityResponse({
    description:
      '코스 순서에 필요한 카테고리 중 장소가 확보되지 않은 카테고리가 있어 코스를 생성할 수 없습니다.',
  })
  @ApiConflictResponse({
    description:
      '모임이 코스 생성 중이거나 이미 코스가 생성 완료·확정된 상태여서 다시 생성할 수 없습니다.',
  })
  @ApiErrorResponse(
    CommonErrorCode.notImplemented,
    '실제 데이터 연동 전까지 제공되지 않는 API',
  )
  generateCourse(
    @Param('meetingId', BigIntStringPipe) meetingId: string,
    @Query('accessToken') _accessToken: string,
  ): never {
    throw new CommonException(CommonErrorCode.notImplemented)
  }

  @Get(':meetingId/courses')
  @ApiParam({
    name: 'meetingId',
    description: '모임 ID',
    schema: { type: 'string', example: '1', pattern: '^\\d+$' },
  })
  @ApiQuery({
    name: 'accessToken',
    description: '모임 참여 시 발급된 참여자 전용 재접속 토큰',
    example: 'host-session-token',
    required: true,
  })
  @ApiOperation({
    summary: '코스 후보 목록 조회',
    description:
      'AI가 생성한 코스 후보 목록을 조회합니다. ' +
      '모임이 코스 생성 완료 상태일 때만 호출할 수 있습니다.',
  })
  @ApiOkResponse({ type: CourseCandidateListResponseDto })
  @ApiBadRequestResponse({ description: 'meetingId 형식이 올바르지 않습니다.' })
  @ApiUnauthorizedResponse({
    description: 'accessToken이 없거나 유효하지 않습니다.',
  })
  @ApiNotFoundResponse({ description: '모임을 찾을 수 없습니다.' })
  @ApiConflictResponse({
    description:
      '모임이 코스 생성 완료 상태가 아니어서 코스 후보 목록을 조회할 수 없습니다.',
  })
  @ApiErrorResponse(
    CommonErrorCode.notImplemented,
    '실제 데이터 연동 전까지 제공되지 않는 API',
  )
  getCourseCandidates(
    @Param('meetingId', BigIntStringPipe) meetingId: string,
    @Query('accessToken') _accessToken: string,
  ): never {
    throw new CommonException(CommonErrorCode.notImplemented)
  }

  @Get(':meetingId/courses/:courseCandidateId')
  @ApiParam({
    name: 'meetingId',
    description: '모임 ID',
    schema: { type: 'string', example: '1', pattern: '^\\d+$' },
  })
  @ApiParam({
    name: 'courseCandidateId',
    description: '코스 후보 ID',
    schema: { type: 'string', example: '1', pattern: '^\\d+$' },
  })
  @ApiQuery({
    name: 'accessToken',
    description: '모임 참여 시 발급된 참여자 전용 재접속 토큰',
    example: 'host-session-token',
    required: true,
  })
  @ApiOperation({
    summary: '코스 상세 조회',
    description:
      'AI가 생성한 코스 후보의 상세 경로와 ' +
      '총 이동 거리를 조회합니다. ' +
      '모임이 코스 생성 완료 상태이거나 코스가 확정된 상태일 때 호출할 수 있습니다.',
  })
  @ApiOkResponse({ type: CourseDetailResponseDto })
  @ApiBadRequestResponse({
    description: 'meetingId, courseCandidateId 형식이 올바르지 않습니다.',
  })
  @ApiUnauthorizedResponse({
    description: 'accessToken이 없거나 유효하지 않습니다.',
  })
  @ApiNotFoundResponse({
    description: '모임 또는 코스 후보를 찾을 수 없습니다.',
  })
  @ApiConflictResponse({
    description:
      '모임이 코스 생성 완료 상태도 확정 상태도 아니어서 코스 상세를 조회할 수 없습니다.',
  })
  @ApiErrorResponse(
    CommonErrorCode.notImplemented,
    '실제 데이터 연동 전까지 제공되지 않는 API',
  )
  getCourseDetail(
    @Param('meetingId', BigIntStringPipe) meetingId: string,
    @Param('courseCandidateId', BigIntStringPipe) courseCandidateId: string,
    @Query('accessToken') _accessToken: string,
  ): never {
    throw new CommonException(CommonErrorCode.notImplemented)
  }

  @Get(':meetingId/courses/:courseCandidateId/comments')
  @ApiParam({
    name: 'meetingId',
    description: '모임 ID',
    schema: { type: 'string', example: '1', pattern: '^\\d+$' },
  })
  @ApiParam({
    name: 'courseCandidateId',
    description: '코스 후보 ID',
    schema: { type: 'string', example: '1', pattern: '^\\d+$' },
  })
  @ApiQuery({
    name: 'accessToken',
    description: '모임 참여 시 발급된 참여자 전용 재접속 토큰',
    example: 'host-session-token',
    required: true,
  })
  @ApiOperation({
    summary: '코스 댓글 목록 조회',
    description:
      '코스 후보에 첨부된 댓글 목록을 조회합니다. ' +
      '모임이 코스 생성 완료 상태일 때만 호출할 수 있습니다.',
  })
  @ApiOkResponse({ type: CourseCommentDto, isArray: true })
  @ApiBadRequestResponse({
    description: 'meetingId, courseCandidateId 형식이 올바르지 않습니다.',
  })
  @ApiUnauthorizedResponse({
    description: 'accessToken이 없거나 유효하지 않습니다.',
  })
  @ApiNotFoundResponse({
    description: '모임 또는 코스 후보를 찾을 수 없습니다.',
  })
  @ApiConflictResponse({
    description:
      '모임이 코스 생성 완료 상태가 아니어서 코스 댓글 목록을 조회할 수 없습니다.',
  })
  @ApiErrorResponse(
    CommonErrorCode.notImplemented,
    '실제 데이터 연동 전까지 제공되지 않는 API',
  )
  getCourseComments(
    @Param('meetingId', BigIntStringPipe) meetingId: string,
    @Param('courseCandidateId', BigIntStringPipe) courseCandidateId: string,
    @Query('accessToken') _accessToken: string,
  ): never {
    throw new CommonException(CommonErrorCode.notImplemented)
  }

  @Post(':meetingId/courses/:courseCandidateId/comments')
  @ApiParam({
    name: 'meetingId',
    description: '모임 ID',
    schema: { type: 'string', example: '1', pattern: '^\\d+$' },
  })
  @ApiParam({
    name: 'courseCandidateId',
    description: '코스 후보 ID',
    schema: { type: 'string', example: '1', pattern: '^\\d+$' },
  })
  @ApiQuery({
    name: 'accessToken',
    description: '모임 참여 시 발급된 참여자 전용 재접속 토큰',
    example: 'host-session-token',
    required: true,
  })
  @ApiOperation({
    summary: '코스 댓글 작성',
    description:
      '코스 후보에 댓글을 작성합니다. ' +
      '모임이 코스 생성 완료 상태일 때만 호출할 수 있습니다.',
  })
  @ApiBody({ type: CreateCourseCommentRequestDto })
  @ApiCreatedResponse({ type: CreateCourseCommentResponseDto })
  @ApiBadRequestResponse({
    description:
      'meetingId, courseCandidateId 형식이 올바르지 않거나 content가 비어 있거나 300자를 초과합니다.',
  })
  @ApiUnauthorizedResponse({
    description: 'accessToken이 없거나 유효하지 않습니다.',
  })
  @ApiNotFoundResponse({
    description: '모임 또는 코스 후보를 찾을 수 없습니다.',
  })
  @ApiConflictResponse({
    description:
      '모임이 코스 생성 완료 상태가 아니어서 댓글을 작성할 수 없습니다.',
  })
  @ApiErrorResponse(
    CommonErrorCode.notImplemented,
    '실제 데이터 연동 전까지 제공되지 않는 API',
  )
  createCourseComment(
    @Param('meetingId', BigIntStringPipe) meetingId: string,
    @Param('courseCandidateId', BigIntStringPipe) courseCandidateId: string,
    @Query('accessToken') _accessToken: string,
    @Body() _dto: CreateCourseCommentRequestDto,
  ): never {
    throw new CommonException(CommonErrorCode.notImplemented)
  }

  @Get(':meetingId/courses/:courseCandidateId/excluded-places')
  @ApiParam({
    name: 'meetingId',
    description: '모임 ID',
    schema: { type: 'string', example: '1', pattern: '^\\d+$' },
  })
  @ApiParam({
    name: 'courseCandidateId',
    description: '코스 후보 ID',
    schema: { type: 'string', example: '1', pattern: '^\\d+$' },
  })
  @ApiQuery({
    name: 'category',
    description:
      '카테고리 필터. 미지정 시 전체 카테고리를 조회합니다. 전체 조회면 null',
    enum: CategorySlug,
    required: false,
    example: CategorySlug.Cafe,
  })
  @ApiQuery({
    name: 'accessToken',
    description: '모임 참여 시 발급된 참여자 전용 재접속 토큰',
    example: 'host-session-token',
    required: true,
  })
  @ApiOperation({
    summary: '제외된 장소 목록 조회',
    description:
      '이 코스에 선택되지 못한 장소 목록을 카테고리별로 조회합니다. ' +
      '모임이 코스 생성 완료 상태일 때만 호출할 수 있습니다.',
  })
  @ApiOkResponse({ type: ExcludedPlaceListResponseDto })
  @ApiBadRequestResponse({
    description:
      'meetingId, courseCandidateId 형식이 올바르지 않거나 category 값이 유효하지 않습니다.',
  })
  @ApiUnauthorizedResponse({
    description: 'accessToken이 없거나 유효하지 않습니다.',
  })
  @ApiNotFoundResponse({
    description: '모임 또는 코스 후보를 찾을 수 없습니다.',
  })
  @ApiConflictResponse({
    description:
      '모임이 코스 생성 완료 상태가 아니어서 제외된 장소 목록을 조회할 수 없습니다.',
  })
  @ApiErrorResponse(
    CommonErrorCode.notImplemented,
    '실제 데이터 연동 전까지 제공되지 않는 API',
  )
  getExcludedPlaces(
    @Param('meetingId', BigIntStringPipe) meetingId: string,
    @Param('courseCandidateId', BigIntStringPipe) courseCandidateId: string,
    @Query('accessToken') _accessToken: string,
    @Query('category', new ParseEnumPipe(CategorySlug, { optional: true }))
    category?: CategorySlug,
  ): never {
    throw new CommonException(CommonErrorCode.notImplemented)
  }

  @Post(':meetingId/courses/:courseCandidateId/places')
  @ApiParam({
    name: 'meetingId',
    description: '모임 ID',
    schema: { type: 'string', example: '1', pattern: '^\\d+$' },
  })
  @ApiParam({
    name: 'courseCandidateId',
    description: '코스 후보 ID',
    schema: { type: 'string', example: '1', pattern: '^\\d+$' },
  })
  @ApiQuery({
    name: 'accessToken',
    description: '코스에 장소를 추가할 방장의 참여자 전용 재접속 토큰',
    example: 'host-session-token',
    required: true,
  })
  @ApiOperation({
    summary: '코스 장소 추가',
    description:
      '제외된 장소 목록에서 고른 장소를 코스 맨 뒤에 추가합니다. 순서를 지정할 수 없고 항상 제일 마지막 장소로 반영됩니다. ' +
      '방장만 호출할 수 있고, 모임이 코스 생성 완료 상태일 때만 호출할 수 있습니다. ' +
      `코스는 최대 ${MAX_COURSE_STEPS}개의 장소로 구성되며, 이미 ${MAX_COURSE_STEPS}개인 경우 추가할 수 없습니다.`,
  })
  @ApiBody({ type: AddCoursePlaceRequestDto })
  @ApiCreatedResponse({
    description: '장소 추가 성공',
    type: CourseDetailResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'meetingId, courseCandidateId 형식이 올바르지 않거나 recommendationId가 비어 있습니다.',
  })
  @ApiUnauthorizedResponse({
    description: 'accessToken이 없거나 유효하지 않습니다.',
  })
  @ApiForbiddenResponse({ description: '방장이 아닙니다.' })
  @ApiNotFoundResponse({
    description: '모임, 코스 후보 또는 장소 추천을 찾을 수 없습니다.',
  })
  @ApiConflictResponse({
    description:
      '모임이 코스 생성 완료 상태가 아니거나, 이미 코스에 포함된 장소이거나, ' +
      `코스에 이미 장소가 ${MAX_COURSE_STEPS}개 있어서 추가할 수 없습니다.`,
  })
  @ApiErrorResponse(
    CommonErrorCode.notImplemented,
    '실제 데이터 연동 전까지 제공되지 않는 API',
  )
  addCoursePlace(
    @Param('meetingId', BigIntStringPipe) meetingId: string,
    @Param('courseCandidateId', BigIntStringPipe) courseCandidateId: string,
    @Query('accessToken') _accessToken: string,
    @Body() _dto: AddCoursePlaceRequestDto,
  ): never {
    throw new CommonException(CommonErrorCode.notImplemented)
  }

  @Put(':meetingId/courses/:courseCandidateId/places')
  @ApiParam({
    name: 'meetingId',
    description: '모임 ID',
    schema: { type: 'string', example: '1', pattern: '^\\d+$' },
  })
  @ApiParam({
    name: 'courseCandidateId',
    description: '코스 후보 ID',
    schema: { type: 'string', example: '1', pattern: '^\\d+$' },
  })
  @ApiQuery({
    name: 'accessToken',
    description: '코스를 수정할 방장의 참여자 전용 재접속 토큰',
    example: 'host-session-token',
    required: true,
  })
  @ApiOperation({
    summary: '코스 전체 수정',
    description:
      '코스를 구성할 장소 추천 ID 전체 목록으로 코스를 통째로 교체합니다. ' +
      '변경되지 않는 장소도 포함해 유지할 전체 목록을 보내야 하며, 배열 순서 그대로 코스에 반영됩니다. ' +
      '방장만 호출할 수 있고, 모임이 코스 생성 완료 상태일 때만 호출할 수 있습니다. ' +
      `코스는 최대 ${MAX_COURSE_STEPS}개의 장소로 구성되며, 목록에 같은 장소 추천 ID가 중복되면 요청이 거부됩니다.`,
  })
  @ApiBody({ type: UpdateCoursePlacesRequestDto })
  @ApiOkResponse({
    description: '코스 수정 성공',
    type: CourseDetailResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'meetingId, courseCandidateId 형식이 올바르지 않거나, recommendationIds가 비어 있거나, ' +
      `${MAX_COURSE_STEPS}개를 초과하거나, 같은 ID가 중복됩니다.`,
  })
  @ApiUnauthorizedResponse({
    description: 'accessToken이 없거나 유효하지 않습니다.',
  })
  @ApiForbiddenResponse({ description: '방장이 아닙니다.' })
  @ApiNotFoundResponse({
    description:
      '모임, 코스 후보 또는 장소 추천 중 존재하지 않는 항목이 있습니다.',
  })
  @ApiConflictResponse({
    description:
      '모임이 코스 생성 완료 상태가 아니어서 코스를 수정할 수 없습니다.',
  })
  @ApiErrorResponse(
    CommonErrorCode.notImplemented,
    '실제 데이터 연동 전까지 제공되지 않는 API',
  )
  updateCoursePlaces(
    @Param('meetingId', BigIntStringPipe) meetingId: string,
    @Param('courseCandidateId', BigIntStringPipe) courseCandidateId: string,
    @Query('accessToken') _accessToken: string,
    @Body() _dto: UpdateCoursePlacesRequestDto,
  ): never {
    throw new CommonException(CommonErrorCode.notImplemented)
  }

  @Post(':meetingId/courses/:courseCandidateId/confirmation')
  @ApiParam({
    name: 'meetingId',
    description: '모임 ID',
    schema: { type: 'string', example: '1', pattern: '^\\d+$' },
  })
  @ApiParam({
    name: 'courseCandidateId',
    description: '확정할 코스 후보 ID',
    schema: { type: 'string', example: '1', pattern: '^\\d+$' },
  })
  @ApiQuery({
    name: 'accessToken',
    description: '코스를 확정할 방장의 참여자 전용 재접속 토큰',
    example: 'host-session-token',
    required: true,
  })
  @ApiOperation({
    summary: '최종 코스 확정',
    description:
      '여러 코스 후보 중 하나를 최종 코스로 확정합니다. ' +
      '방장만 호출할 수 있고, 모임이 코스 생성 완료 상태일 때만 호출할 수 있습니다.',
  })
  @ApiBody({ type: ConfirmCourseRequestDto })
  @ApiOkResponse({ type: MeetingStatusResponseDto })
  @ApiBadRequestResponse({
    description: 'meetingId, courseCandidateId 형식이 올바르지 않습니다.',
  })
  @ApiUnauthorizedResponse({
    description: 'accessToken이 없거나 유효하지 않습니다.',
  })
  @ApiForbiddenResponse({ description: '방장이 아닙니다.' })
  @ApiNotFoundResponse({
    description: '모임 또는 코스 후보를 찾을 수 없습니다.',
  })
  @ApiConflictResponse({
    description:
      '모임이 코스 생성 완료 상태가 아니어서(아직 후보가 없거나 이미 확정됨) 코스를 확정할 수 없습니다.',
  })
  @ApiErrorResponse(
    CommonErrorCode.notImplemented,
    '실제 데이터 연동 전까지 제공되지 않는 API',
  )
  confirmCourse(
    @Param('meetingId', BigIntStringPipe) meetingId: string,
    @Param('courseCandidateId', BigIntStringPipe) courseCandidateId: string,
    @Query('accessToken') _accessToken: string,
    @Body() _dto: ConfirmCourseRequestDto,
  ): never {
    throw new CommonException(CommonErrorCode.notImplemented)
  }
}
