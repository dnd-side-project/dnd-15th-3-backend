import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotImplementedException,
  Param,
  Post,
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
import { CategorySlug } from 'src/category/enums/category-slug.enum'
import { BigIntStringPipe } from 'src/common/pipes/bigint-string.pipe'
import { MeetingStatusResponseDto } from 'src/meeting/dto/meeting-status-response.dto'
import { CourseCandidateListResponseDto } from './dto/course-candidate-list-response.dto'
import { CourseCommentDto } from './dto/course-comment.dto'
import { CourseCommentListResponseDto } from './dto/course-comment-list-response.dto'
import { CourseDetailResponseDto } from './dto/course-detail-response.dto'
import { CourseGuideResponseDto } from './dto/course-guide-response.dto'
import { CreateCourseCommentRequestDto } from './dto/create-course-comment-request.dto'
import { ExcludedPlaceListResponseDto } from './dto/excluded-place-list-response.dto'

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
  @ApiOperation({
    summary: 'AI 코스 생성',
    description:
      'AI를 이용해 모임에 추가된 장소 추천을 기반으로 코스 생성을 요청합니다. ' +
      '코스 순서 기준으로 각 카테고리를 채울 장소가 확보되어 있는지 먼저 확인합니다. ' +
      '요청이 접수되면 모임 상태가 코스 생성 중으로 즉시 전환되고, ' +
      '이후 모임 상태 조회 API로 완료 또는 실패 여부를 확인할 수 있습니다. ' +
      '방장만 호출할 수 있고, 모임이 장소 추천 수집 중이거나 코스 생성 실패 상태일 때만 호출할 수 있습니다.',
  })
  @ApiAcceptedResponse({
    description: '코스 생성 요청이 접수되어 처리 중입니다.',
    type: MeetingStatusResponseDto,
  })
  @ApiBadRequestResponse({ description: 'meetingId 형식이 올바르지 않습니다.' })
  @ApiUnauthorizedResponse({
    description: '인증 정보가 없거나 유효하지 않습니다.',
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
  @ApiResponse({
    status: 501,
    description: '실제 데이터 연동 전까지 제공되지 않는 API입니다.',
  })
  generateCourse(
    @Param('meetingId', BigIntStringPipe) meetingId: string,
  ): never {
    throw new NotImplementedException(
      'AI 코스 생성 API는 실제 데이터 연동 후 제공됩니다.',
    )
  }

  @Get(':meetingId/courses')
  @ApiParam({
    name: 'meetingId',
    description: '모임 ID',
    schema: { type: 'string', example: '1', pattern: '^\\d+$' },
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
    description: '인증 정보가 없거나 유효하지 않습니다.',
  })
  @ApiForbiddenResponse({ description: '해당 모임의 참여자가 아닙니다.' })
  @ApiNotFoundResponse({ description: '모임을 찾을 수 없습니다.' })
  @ApiConflictResponse({
    description:
      '모임이 코스 생성 완료 상태가 아니어서 코스 후보 목록을 조회할 수 없습니다.',
  })
  @ApiResponse({
    status: 501,
    description: '실제 데이터 연동 전까지 제공되지 않는 API입니다.',
  })
  getCourseCandidates(
    @Param('meetingId', BigIntStringPipe) meetingId: string,
  ): never {
    throw new NotImplementedException(
      '코스 후보 목록 조회 API는 실제 데이터 연동 후 제공됩니다.',
    )
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
  @ApiOperation({
    summary: '코스 상세 조회',
    description:
      'AI가 생성한 코스 후보의 상세 경로를 조회합니다. ' +
      '모임이 코스 생성 완료 상태이거나 코스가 확정된 상태일 때 호출할 수 있습니다.',
  })
  @ApiOkResponse({ type: CourseDetailResponseDto })
  @ApiBadRequestResponse({
    description: 'meetingId, courseCandidateId 형식이 올바르지 않습니다.',
  })
  @ApiUnauthorizedResponse({
    description: '인증 정보가 없거나 유효하지 않습니다.',
  })
  @ApiForbiddenResponse({ description: '해당 모임의 참여자가 아닙니다.' })
  @ApiNotFoundResponse({
    description: '모임 또는 코스 후보를 찾을 수 없습니다.',
  })
  @ApiConflictResponse({
    description:
      '모임이 코스 생성 완료 상태도 확정 상태도 아니어서 코스 상세를 조회할 수 없습니다.',
  })
  @ApiResponse({
    status: 501,
    description: '실제 데이터 연동 전까지 제공되지 않는 API입니다.',
  })
  getCourseDetail(
    @Param('meetingId', BigIntStringPipe) meetingId: string,
    @Param('courseCandidateId', BigIntStringPipe) courseCandidateId: string,
  ): never {
    throw new NotImplementedException(
      '코스 상세 조회 API는 실제 데이터 연동 후 제공됩니다.',
    )
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
  @ApiOperation({
    summary: '코스 댓글 목록 조회',
    description:
      '코스 후보에 첨부된 댓글 목록을 조회합니다. ' +
      '모임이 코스 생성 완료 상태일 때만 호출할 수 있습니다.',
  })
  @ApiOkResponse({ type: CourseCommentListResponseDto })
  @ApiBadRequestResponse({
    description: 'meetingId, courseCandidateId 형식이 올바르지 않습니다.',
  })
  @ApiUnauthorizedResponse({
    description: '인증 정보가 없거나 유효하지 않습니다.',
  })
  @ApiForbiddenResponse({ description: '해당 모임의 참여자가 아닙니다.' })
  @ApiNotFoundResponse({
    description: '모임 또는 코스 후보를 찾을 수 없습니다.',
  })
  @ApiConflictResponse({
    description:
      '모임이 코스 생성 완료 상태가 아니어서 코스 댓글 목록을 조회할 수 없습니다.',
  })
  @ApiResponse({
    status: 501,
    description: '실제 데이터 연동 전까지 제공되지 않는 API입니다.',
  })
  getCourseComments(
    @Param('meetingId', BigIntStringPipe) meetingId: string,
    @Param('courseCandidateId', BigIntStringPipe) courseCandidateId: string,
  ): never {
    throw new NotImplementedException(
      '코스 댓글 목록 조회 API는 실제 데이터 연동 후 제공됩니다.',
    )
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
  @ApiOperation({
    summary: '코스 댓글 작성',
    description:
      '코스 후보에 댓글을 작성합니다. ' +
      '모임이 코스 생성 완료 상태일 때만 호출할 수 있습니다.',
  })
  @ApiBody({ type: CreateCourseCommentRequestDto })
  @ApiCreatedResponse({ type: CourseCommentDto })
  @ApiBadRequestResponse({
    description:
      'meetingId, courseCandidateId 형식이 올바르지 않거나 content가 비어 있거나 300자를 초과합니다.',
  })
  @ApiUnauthorizedResponse({
    description: '인증 정보가 없거나 유효하지 않습니다.',
  })
  @ApiForbiddenResponse({ description: '해당 모임의 참여자가 아닙니다.' })
  @ApiNotFoundResponse({
    description: '모임 또는 코스 후보를 찾을 수 없습니다.',
  })
  @ApiConflictResponse({
    description:
      '모임이 코스 생성 완료 상태가 아니어서 댓글을 작성할 수 없습니다.',
  })
  @ApiResponse({
    status: 501,
    description: '실제 데이터 연동 전까지 제공되지 않는 API입니다.',
  })
  createCourseComment(
    @Param('meetingId', BigIntStringPipe) meetingId: string,
    @Param('courseCandidateId', BigIntStringPipe) courseCandidateId: string,
    @Body() _dto: CreateCourseCommentRequestDto,
  ): never {
    throw new NotImplementedException(
      '코스 댓글 작성 API는 실제 데이터 연동 후 제공됩니다.',
    )
  }

  @Get(':meetingId/courses/:courseCandidateId/guide')
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
  @ApiOperation({
    summary: '코스 가이드 조회',
    description:
      '선택된 코스의 방문 순서, 총 이동 거리, 방문 장소 개수, 장소 간 도보 이동 시간 등을 조회합니다. ' +
      '모임이 코스 생성 완료 상태이거나 코스가 확정된 상태일 때 호출할 수 있습니다.',
  })
  @ApiOkResponse({ type: CourseGuideResponseDto })
  @ApiBadRequestResponse({
    description: 'meetingId, courseCandidateId 형식이 올바르지 않습니다.',
  })
  @ApiUnauthorizedResponse({
    description: '인증 정보가 없거나 유효하지 않습니다.',
  })
  @ApiForbiddenResponse({ description: '해당 모임의 참여자가 아닙니다.' })
  @ApiNotFoundResponse({
    description: '모임 또는 코스 후보를 찾을 수 없습니다.',
  })
  @ApiConflictResponse({
    description:
      '모임이 코스 생성 완료 상태도 확정 상태도 아니어서 코스 가이드를 조회할 수 없습니다.',
  })
  @ApiResponse({
    status: 501,
    description: '실제 데이터 연동 전까지 제공되지 않는 API입니다.',
  })
  getCourseGuide(
    @Param('meetingId', BigIntStringPipe) meetingId: string,
    @Param('courseCandidateId', BigIntStringPipe) courseCandidateId: string,
  ): never {
    throw new NotImplementedException(
      '코스 가이드 조회 API는 실제 데이터 연동 후 제공됩니다.',
    )
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
    description: '카테고리 필터. 미지정 시 전체 카테고리를 조회합니다.',
    enum: CategorySlug,
    required: false,
    example: CategorySlug.Cafe,
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
    description: '인증 정보가 없거나 유효하지 않습니다.',
  })
  @ApiForbiddenResponse({ description: '해당 모임의 참여자가 아닙니다.' })
  @ApiNotFoundResponse({
    description: '모임 또는 코스 후보를 찾을 수 없습니다.',
  })
  @ApiConflictResponse({
    description:
      '모임이 코스 생성 완료 상태가 아니어서 제외된 장소 목록을 조회할 수 없습니다.',
  })
  @ApiResponse({
    status: 501,
    description: '실제 데이터 연동 전까지 제공되지 않는 API입니다.',
  })
  getExcludedPlaces(
    @Param('meetingId', BigIntStringPipe) meetingId: string,
    @Param('courseCandidateId', BigIntStringPipe) courseCandidateId: string,
    @Query('category') category?: CategorySlug,
  ): never {
    throw new NotImplementedException(
      '제외된 장소 목록 조회 API는 실제 데이터 연동 후 제공됩니다.',
    )
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
  @ApiOperation({
    summary: '최종 코스 확정',
    description:
      '여러 코스 후보 중 하나를 최종 코스로 확정합니다. ' +
      '방장만 호출할 수 있고, 모임이 코스 생성 완료 상태일 때만 호출할 수 있습니다.',
  })
  @ApiOkResponse({ type: MeetingStatusResponseDto })
  @ApiBadRequestResponse({
    description: 'meetingId, courseCandidateId 형식이 올바르지 않습니다.',
  })
  @ApiUnauthorizedResponse({
    description: '인증 정보가 없거나 유효하지 않습니다.',
  })
  @ApiForbiddenResponse({ description: '방장이 아닙니다.' })
  @ApiNotFoundResponse({
    description: '모임 또는 코스 후보를 찾을 수 없습니다.',
  })
  @ApiConflictResponse({
    description:
      '모임이 코스 생성 완료 상태가 아니어서(아직 후보가 없거나 이미 확정됨) 코스를 확정할 수 없습니다.',
  })
  @ApiResponse({
    status: 501,
    description: '실제 데이터 연동 전까지 제공되지 않는 API입니다.',
  })
  confirmCourse(
    @Param('meetingId', BigIntStringPipe) meetingId: string,
    @Param('courseCandidateId', BigIntStringPipe) courseCandidateId: string,
  ): never {
    throw new NotImplementedException(
      '최종 코스 확정 API는 실제 데이터 연동 후 제공됩니다.',
    )
  }
}
