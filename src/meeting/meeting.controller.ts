import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  ParseFilePipeBuilder,
  Patch,
  Post,
  Put,
  Query,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger'
import { SimilarPlaceResponseDto } from 'src/catalog/dto/similar-place-response.dto'
import { MAX_COURSE_STEPS } from 'src/category/category.constants'
import { CategorySlug } from 'src/category/enums/category-slug.enum'
import { ApiErrorResponse } from 'src/common/decorators/api-error-response.decorator'
import { CommonException } from 'src/common/exception/common.exception'
import { CommonErrorCode } from 'src/common/exception/common-error-code'
import { createValidationException } from 'src/common/exception/validation-exception.factory'
import { BigIntStringPipe } from 'src/common/pipes/bigint-string.pipe'
import { BigIntStringArrayPipe } from 'src/common/pipes/bigint-string-array.pipe'
import { PositiveIntPipe } from 'src/common/pipes/positive-int.pipe'
import { MapPinsResponseDto } from 'src/place/dto/map-pins-response.dto'
import { AddRecommendationDto } from './dto/add-recommendation.dto'
import { CourseImageResponseDto } from './dto/course-image-response.dto'
import { CoursePlanResponseDto } from './dto/course-plan-response.dto'
import { CreateMeetingDto } from './dto/create-meeting.dto'
import { InvitationPreviewRequestDto } from './dto/invitation-preview-request.dto'
import { JoinMeetingDto } from './dto/join-meeting.dto'
import { MeetingDetailsResponseDto } from './dto/meeting-details-response.dto'
import { MeetingInvitationResponseDto } from './dto/meeting-invitation-response.dto'
import {
  MeetingLocationDto,
  MeetingLocationResponseDto,
} from './dto/meeting-location.dto'
import { MeetingScreenResponseDto } from './dto/meeting-screen-response.dto'
import { MeetingStatusResponseDto } from './dto/meeting-status-response.dto'
import { PlacePreferenceResponseDto } from './dto/place-preference-response.dto'
import { RecommendationPreviewDto } from './dto/recommendation-preview.dto'
import { UpdateCoursePlanDto } from './dto/update-course-plan.dto'
import { UpdateMeetingDetailsDto } from './dto/update-meeting-details.dto'
import { UpdatePlacePreferenceRequestDto } from './dto/update-place-preference-request.dto'
import { MeetingErrorCode } from './exception/meeting-error-code'
import { type CourseImageFile, MeetingService } from './meeting.service'
import {
  createMeetingRequestSchema,
  invitationPreviewRequestSchema,
  joinMeetingRequestSchema,
  meetingLocationSchema,
  updateCoursePlanRequestSchema,
  updateMeetingDetailsRequestSchema,
} from './schema/meeting-request.schema'
import { addRecommendationRequestSchema } from './schema/recommendation-request.schema'

@ApiTags('모임')
@Controller('meetings')
export class MeetingController {
  constructor(private readonly meetingService: MeetingService) {}

  @Post()
  @ApiOperation({
    summary: '모임 생성',
    description:
      '호스트 온보딩의 모임 유형·장소·카테고리·날짜/시간·프로필 입력을 한 번에 저장하고 초대 코드를 발급합니다.',
  })
  @ApiCreatedResponse({
    description: '모임 생성 및 방장 참여 성공',
    type: MeetingScreenResponseDto,
  })
  @ApiErrorResponse(
    CommonErrorCode.validationError,
    '필수 입력값 또는 날짜/시간 형식이 올바르지 않음',
  )
  @ApiErrorResponse(
    MeetingErrorCode.meetingTypeNotFound,
    '모임 유형을 찾을 수 없음',
  )
  @ApiErrorResponse(
    MeetingErrorCode.invitationCodeIssuanceFailed,
    '초대 코드 발급에 실패함',
  )
  createMeeting(@Body() dto: CreateMeetingDto) {
    const parsed = createMeetingRequestSchema.safeParse(dto)
    if (!parsed.success) {
      throw createValidationException(parsed.error.issues)
    }

    return this.meetingService.createMeeting(parsed.data)
  }

  @Patch(':meetingId')
  @ApiOperation({
    summary: '모임 기본 정보 변경',
    description:
      '방장이 코스 생성 전 모임 이름·날짜·시간·유형 중 하나 이상을 변경합니다.',
  })
  @ApiParam({ name: 'meetingId', description: '모임 ID', example: '1' })
  @ApiQuery({
    name: 'accessToken',
    description: '방장의 참여자 전용 재접속 토큰',
    example: 'host-session-token',
    required: true,
  })
  @ApiOkResponse({
    description: '모임 기본 정보 변경 성공',
    type: MeetingDetailsResponseDto,
  })
  @ApiExtraModels(UpdateMeetingDetailsDto)
  @ApiBody({
    description: '이름·날짜·시간·모임 유형 중 하나 이상을 전달합니다.',
    schema: {
      allOf: [{ $ref: getSchemaPath(UpdateMeetingDetailsDto) }],
      minProperties: 1,
    },
  })
  @ApiErrorResponse(
    CommonErrorCode.validationError,
    '수정할 필드가 없거나 입력 형식이 올바르지 않음',
  )
  @ApiErrorResponse(
    CommonErrorCode.authenticationFailed,
    '참여자 토큰이 유효하지 않음',
  )
  @ApiErrorResponse(MeetingErrorCode.hostOnly, '방장 권한이 필요함')
  @ApiErrorResponse(
    [MeetingErrorCode.notFound, MeetingErrorCode.meetingTypeNotFound],
    '모임 또는 모임 유형을 찾을 수 없음',
  )
  @ApiErrorResponse(
    MeetingErrorCode.meetingDetailsNotEditable,
    '코스 생성을 시작한 상태여서 기본 정보를 변경할 수 없음',
  )
  updateMeetingDetails(
    @Param('meetingId', BigIntStringPipe) meetingId: string,
    @Query('accessToken') accessToken: string,
    @Body() dto: UpdateMeetingDetailsDto,
  ): Promise<MeetingDetailsResponseDto> {
    const parsed = updateMeetingDetailsRequestSchema.safeParse(dto)
    if (!parsed.success) {
      throw createValidationException(parsed.error.issues)
    }

    return this.meetingService.updateMeetingDetails(
      meetingId,
      accessToken,
      parsed.data,
    )
  }

  @Put(':meetingId/location')
  @ApiOperation({
    summary: '첫 만남 기준 위치 변경',
    description:
      '기준 위치를 변경하고 최신 위치에 대한 장소 수집 작업을 새로 등록합니다.',
  })
  @ApiParam({ name: 'meetingId', description: '모임 ID', example: '1' })
  @ApiQuery({
    name: 'accessToken',
    description: '모임 참여자 전용 재접속 토큰',
    example: 'host-session-token',
    required: true,
  })
  @ApiOkResponse({
    description: '첫 만남 기준 위치 변경 성공',
    type: MeetingLocationResponseDto,
  })
  @ApiErrorResponse(
    CommonErrorCode.validationError,
    '위치 형식이 올바르지 않음',
  )
  @ApiErrorResponse(
    CommonErrorCode.authenticationFailed,
    '참여자 토큰이 유효하지 않음',
  )
  @ApiErrorResponse(MeetingErrorCode.hostOnly, '방장 권한이 필요함')
  @ApiErrorResponse(
    MeetingErrorCode.locationNotFound,
    '모임 기준 위치를 찾을 수 없음',
  )
  @ApiErrorResponse(
    MeetingErrorCode.courseInputNotEditable,
    '코스 생성을 시작한 상태여서 기준 위치를 변경할 수 없음',
  )
  updateLocation(
    @Param('meetingId') meetingId: string,
    @Query('accessToken') accessToken: string,
    @Body() dto: MeetingLocationDto,
  ) {
    const parsed = meetingLocationSchema.safeParse(dto)
    if (!parsed.success) {
      throw createValidationException(parsed.error.issues)
    }

    return this.meetingService.updateLocation(
      meetingId,
      accessToken,
      parsed.data,
    )
  }

  @Post(':meetingId/recommendations')
  @ApiOperation({
    summary: '장소를 모임 추천 목록에 추가',
    description:
      'GET /places/search 응답의 items[].id를 placeId로 전달해 현재 모임의 추천 장소로 추가합니다. GET /places/first-meeting의 id는 사용할 수 없습니다. 응답의 previewPhoto를 추천 장소 대표 사진으로 사용합니다.',
  })
  @ApiParam({ name: 'meetingId', description: '모임 ID', example: '1' })
  @ApiQuery({
    name: 'accessToken',
    description: '모임 참여자 전용 재접속 토큰',
    example: 'member-session-token',
    required: true,
  })
  @ApiCreatedResponse({
    description: '추천 장소 추가 성공',
    type: RecommendationPreviewDto,
  })
  @ApiBody({ type: AddRecommendationDto })
  @ApiErrorResponse(
    [
      CommonErrorCode.validationError,
      MeetingErrorCode.placeCategoryMismatch,
      MeetingErrorCode.placeOutsideRange,
    ],
    '요청 형식이나 장소 추가 조건이 올바르지 않음',
  )
  @ApiErrorResponse(
    MeetingErrorCode.recommendationAlreadyExists,
    '이미 모임에 추가된 장소',
  )
  @ApiErrorResponse(
    CommonErrorCode.authenticationFailed,
    '참여자 토큰이 유효하지 않음',
  )
  @ApiErrorResponse(
    [MeetingErrorCode.locationNotFound, MeetingErrorCode.placeNotFound],
    '모임 기준 위치 또는 장소를 찾을 수 없음',
  )
  @ApiErrorResponse(
    MeetingErrorCode.courseInputNotEditable,
    '코스 생성을 시작한 상태여서 추천 장소를 추가할 수 없음',
  )
  addRecommendation(
    @Param('meetingId') meetingId: string,
    @Query('accessToken') accessToken: string,
    @Body() body: AddRecommendationDto,
  ) {
    const parsed = addRecommendationRequestSchema.safeParse(body)
    if (!parsed.success) {
      throw createValidationException(parsed.error.issues)
    }

    return this.meetingService.addRecommendation(
      meetingId,
      accessToken,
      parsed.data,
    )
  }

  @Get(':meetingId/recommendations')
  @ApiOperation({
    summary: '모임 추천 장소 목록 조회',
    description:
      '응답 배열 각 항목의 previewPhoto로 추천 장소 대표 사진을 반환합니다. 사진이 없으면 null입니다.',
  })
  @ApiParam({ name: 'meetingId', description: '모임 ID', example: '1' })
  @ApiQuery({
    name: 'accessToken',
    description: '모임 참여자 전용 재접속 토큰',
    example: 'member-session-token',
    required: true,
  })
  @ApiOkResponse({
    description: '추천 장소 목록 조회 성공',
    type: RecommendationPreviewDto,
    isArray: true,
  })
  @ApiErrorResponse(
    CommonErrorCode.authenticationFailed,
    '참여자 토큰이 유효하지 않음',
  )
  getRecommendations(
    @Param('meetingId') meetingId: string,
    @Query('accessToken') accessToken: string,
  ) {
    return this.meetingService.getRecommendations(meetingId, accessToken)
  }

  @Get(':meetingId/course-plan')
  @ApiOperation({
    summary: '코스 계획 조회',
    description:
      '현재 선택된 카테고리와 순서를 조회합니다. 코스 순서는 categorySteps 배열 순서와 order로 표현됩니다.',
  })
  @ApiParam({ name: 'meetingId', description: '모임 ID', example: '1' })
  @ApiQuery({
    name: 'accessToken',
    description: '모임 참여 시 발급된 참여자 전용 재접속 토큰',
    example: 'host-session-token',
    required: true,
  })
  @ApiOkResponse({
    description: '코스 계획 조회 성공',
    type: CoursePlanResponseDto,
  })
  @ApiErrorResponse(
    CommonErrorCode.authenticationFailed,
    'accessToken이 없거나 유효하지 않음',
  )
  @ApiErrorResponse(MeetingErrorCode.notFound, '모임 ID가 존재하지 않음')
  getCoursePlan(
    @Param('meetingId') meetingId: string,
    @Query('accessToken') accessToken: string,
  ) {
    return this.meetingService.getCoursePlan(meetingId, accessToken)
  }

  @Put(':meetingId/course-plan')
  @ApiOperation({
    summary: '코스 계획 전체 저장',
    description:
      '추가·삭제·순서 변경 결과를 현재 전체 배열로 교체합니다. Drag & drop 중간 이벤트가 아니라 저장 시점에 호출합니다.',
  })
  @ApiParam({ name: 'meetingId', description: '모임 ID', example: '1' })
  @ApiQuery({
    name: 'accessToken',
    description: '코스를 수정할 방장의 참여자 전용 재접속 토큰',
    example: 'host-session-token',
    required: true,
  })
  @ApiOkResponse({
    description: '코스 계획 저장 성공',
    type: CoursePlanResponseDto,
  })
  @ApiErrorResponse(
    [CommonErrorCode.validationError, MeetingErrorCode.invalidCourseCategory],
    `코스 카테고리가 ${MAX_COURSE_STEPS}개를 초과했거나 유효하지 않음`,
  )
  @ApiErrorResponse(
    CommonErrorCode.authenticationFailed,
    'accessToken이 없거나 유효하지 않음',
  )
  @ApiErrorResponse(MeetingErrorCode.hostOnly, '방장 권한이 필요함')
  @ApiErrorResponse(MeetingErrorCode.notFound, '모임 ID가 존재하지 않음')
  @ApiErrorResponse(
    MeetingErrorCode.staleCoursePlan,
    '오래된 version으로 저장을 시도함',
  )
  @ApiErrorResponse(
    MeetingErrorCode.courseInputNotEditable,
    '코스 생성을 시작한 상태여서 코스 계획을 변경할 수 없음',
  )
  updateCoursePlan(
    @Param('meetingId') meetingId: string,
    @Query('accessToken') accessToken: string,
    @Body() dto: UpdateCoursePlanDto,
  ) {
    const parsed = updateCoursePlanRequestSchema.safeParse(dto)
    if (!parsed.success) {
      throw createValidationException(parsed.error.issues)
    }

    return this.meetingService.updateCoursePlan(
      meetingId,
      accessToken,
      parsed.data,
    )
  }

  @Post('invitation/preview')
  @ApiOperation({
    summary: '초대 코드 검증 및 모임 미리보기',
    description:
      '초대 코드 입력 화면에서 호출합니다. 코드가 유효하면 모임 정보를 반환하고, 이후 프로필 입력·참여 단계로 이동할 수 있습니다. 이 단계에서는 아직 참여자 전용 토큰을 발급하지 않습니다.',
  })
  @ApiOkResponse({
    description: '초대 코드 검증 및 모임 미리보기 성공',
    type: MeetingInvitationResponseDto,
  })
  @ApiErrorResponse(
    CommonErrorCode.validationError,
    '초대 코드가 비어 있거나 6자리 형식이 아님',
  )
  @ApiErrorResponse(
    MeetingErrorCode.invitationNotFound,
    '유효하지 않거나 삭제된 초대 코드',
  )
  previewInvitation(@Body() dto: InvitationPreviewRequestDto) {
    const parsed = invitationPreviewRequestSchema.safeParse(dto)
    if (!parsed.success) {
      throw createValidationException(parsed.error.issues)
    }

    return this.meetingService.previewInvitation(parsed.data)
  }

  @Post('join')
  @ApiOperation({
    summary: '모임 참여',
    description:
      '게스트가 초대 코드를 입력하고 프로필을 선택한 뒤 모임에 참여합니다. 동일한 사용자의 재시도는 기존 참여자를 반환합니다.',
  })
  @ApiCreatedResponse({
    description: '모임 참여 성공',
    type: MeetingScreenResponseDto,
  })
  @ApiErrorResponse(
    CommonErrorCode.validationError,
    '초대 코드 형식 또는 프로필 입력이 올바르지 않음',
  )
  @ApiErrorResponse(
    MeetingErrorCode.invitationNotFound,
    '유효하지 않거나 삭제된 초대 코드',
  )
  @ApiErrorResponse(
    MeetingErrorCode.nicknameAlreadyInUse,
    '이미 사용 중인 닉네임',
  )
  joinMeeting(@Body() dto: JoinMeetingDto) {
    const parsed = joinMeetingRequestSchema.safeParse(dto)
    if (!parsed.success) {
      throw createValidationException(parsed.error.issues)
    }

    return this.meetingService.joinMeeting(parsed.data)
  }

  @Get(':meetingId')
  @ApiParam({
    name: 'meetingId',
    description: '조회할 모임의 ID',
    schema: { type: 'string', example: '1', pattern: '^\\d+$' },
  })
  @ApiQuery({
    name: 'accessToken',
    description: '모임 참여 시 발급된 참여자 전용 재접속 토큰',
    example: 'host-session-token',
    required: true,
  })
  @ApiOperation({
    summary: '모임 상태 조회',
    description:
      '모임이 현재 어느 단계에 있는지 조회합니다. ' +
      '장소 추천 수집 중(RECOMMENDATION_COLLECTING) → 코스 생성 중(COURSE_GENERATING) → ' +
      '코스 생성 완료(COURSE_GENERATED) 또는 생성 실패(COURSE_GENERATION_FAILED) → ' +
      '코스 확정(COURSE_CONFIRMED) 순서로 진행됩니다. ' +
      'AI 코스 생성이 실패하면 내부 로직으로 경로를 직접 생성하는 방식으로 재시도하며, ' +
      '이마저 실패하면 COURSE_GENERATION_FAILED로 전환됩니다.',
  })
  @ApiOkResponse({ type: MeetingStatusResponseDto })
  @ApiErrorResponse(
    CommonErrorCode.validationError,
    'meetingId 형식이 올바르지 않음',
  )
  @ApiErrorResponse(
    CommonErrorCode.authenticationFailed,
    'accessToken이 없거나 유효하지 않음',
  )
  @ApiErrorResponse(MeetingErrorCode.notFound, '모임을 찾을 수 없음')
  @ApiErrorResponse(
    MeetingErrorCode.confirmedCourseCandidateNotFound,
    '모임이 코스 확정 상태인데 확정된 코스 후보를 찾을 수 없는 데이터 정합성 오류',
  )
  getMeetingStatus(
    @Param('meetingId', BigIntStringPipe) meetingId: string,
    @Query('accessToken') accessToken: string,
  ): Promise<MeetingStatusResponseDto> {
    return this.meetingService.getMeetingStatus(meetingId, accessToken)
  }

  @Get(':meetingId/places/pins')
  @ApiParam({
    name: 'meetingId',
    description: '조회할 모임의 ID',
    schema: { type: 'string', example: '1', pattern: '^\\d+$' },
  })
  @ApiQuery({
    name: 'accessToken',
    description: '모임 참여 시 발급된 참여자 전용 재접속 토큰',
    example: 'host-session-token',
    required: true,
  })
  @ApiOperation({
    summary: '전체 지도 핀 조회',
    description:
      '지도에 추가한 모든 장소의 위치 정보가 핀으로 표시됩니다. ' +
      '사용자가 공유한 장소와 모임 시작지를 구분해서 반환합니다. ' +
      '모임이 장소 추천 수집 중, 코스 생성 중, 코스 생성 실패 상태일 때만 호출할 수 있고, ' +
      '코스가 생성 완료되었거나 확정된 상태에서는 호출할 수 없습니다.',
  })
  @ApiOkResponse({ type: MapPinsResponseDto })
  @ApiErrorResponse(
    CommonErrorCode.validationError,
    'meetingId 형식이 올바르지 않음',
  )
  @ApiErrorResponse(
    CommonErrorCode.authenticationFailed,
    'accessToken이 없거나 유효하지 않음',
  )
  @ApiErrorResponse(MeetingErrorCode.notFound, '모임을 찾을 수 없음')
  @ApiErrorResponse(
    MeetingErrorCode.mapPinsNotVisible,
    '모임이 코스 생성 완료 또는 확정된 상태여서 지도 핀을 조회할 수 없음',
  )
  @ApiErrorResponse(
    MeetingErrorCode.meetingLocationDataMissing,
    '모임은 존재하지만 시작지 정보를 찾을 수 없는 데이터 정합성 오류',
  )
  getMapPins(
    @Param('meetingId', BigIntStringPipe) meetingId: string,
    @Query('accessToken') accessToken: string,
  ): Promise<MapPinsResponseDto> {
    return this.meetingService.getMapPins(meetingId, accessToken)
  }

  @Patch(':meetingId/places/:recommendationId/preference')
  @ApiParam({
    name: 'meetingId',
    description: '모임 ID',
    schema: { type: 'string', example: '1', pattern: '^\\d+$' },
  })
  @ApiParam({
    name: 'recommendationId',
    description: '추천 장소 ID',
    schema: { type: 'string', example: '1', pattern: '^\\d+$' },
  })
  @ApiQuery({
    name: 'accessToken',
    description: '모임 참여 시 발급된 참여자 전용 재접속 토큰',
    example: 'host-session-token',
    required: true,
  })
  @ApiOperation({
    summary: '장소 반응(좋아요/싫어요) 설정',
    description:
      '추가된 장소에 대한 내 반응을 좋아요 또는 싫어요로 설정합니다. ' +
      'preference를 null로 보내면 기존 반응을 취소합니다. ' +
      '모임이 장소 추천 수집 중, 코스 생성 완료, 코스 생성 실패 상태일 때만 호출할 수 있고, ' +
      '코스 생성 중이거나 코스가 확정된 상태에서는 호출할 수 없습니다.',
  })
  @ApiBody({ type: UpdatePlacePreferenceRequestDto })
  @ApiOkResponse({ type: PlacePreferenceResponseDto })
  @ApiErrorResponse(
    CommonErrorCode.validationError,
    'meetingId, recommendationId 형식이 올바르지 않거나 preference 값이 유효하지 않음',
  )
  @ApiErrorResponse(
    CommonErrorCode.authenticationFailed,
    'accessToken이 없거나 유효하지 않음',
  )
  @ApiErrorResponse(
    [MeetingErrorCode.notFound, MeetingErrorCode.recommendationNotFound],
    '모임 또는 추천 장소를 찾을 수 없음',
  )
  @ApiErrorResponse(
    MeetingErrorCode.placePreferenceNotEditable,
    '모임이 코스 생성 중이거나 코스가 확정된 상태여서 반응을 변경할 수 없음',
  )
  updatePlacePreference(
    @Param('meetingId', BigIntStringPipe) meetingId: string,
    @Param('recommendationId', BigIntStringPipe) recommendationId: string,
    @Query('accessToken') accessToken: string,
    @Body() dto: UpdatePlacePreferenceRequestDto,
  ): Promise<PlacePreferenceResponseDto> {
    return this.meetingService.updatePlacePreference(
      meetingId,
      recommendationId,
      accessToken,
      dto.preference,
    )
  }

  @Put(':meetingId/course-image')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    }),
  )
  @ApiParam({
    name: 'meetingId',
    description: '모임 ID',
    schema: { type: 'string', example: '1', pattern: '^\\d+$' },
  })
  @ApiQuery({
    name: 'accessToken',
    description: '방장의 참여자 전용 재접속 토큰',
    example: 'host-session-token',
    required: true,
  })
  @ApiOperation({
    summary: '코스 이미지 최초 등록',
    description:
      '확정된 코스를 프론트엔드에서 렌더링한 이미지로 등록합니다. ' +
      '방장만 호출할 수 있으며, 먼저 등록된 이미지는 교체하지 않습니다. ' +
      '이미 등록되었다면 새 파일을 저장하지 않고 기존 결과를 반환합니다.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOkResponse({
    description: '최초 등록된 코스 이미지',
    type: CourseImageResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'meetingId 형식이 올바르지 않거나 파일이 없고, 지원하지 않는 형식이거나 10 MiB를 초과합니다.',
  })
  @ApiUnauthorizedResponse({
    description: 'accessToken이 없거나 유효하지 않습니다.',
  })
  @ApiForbiddenResponse({ description: '방장이 아닙니다.' })
  @ApiNotFoundResponse({ description: '모임을 찾을 수 없습니다.' })
  @ApiConflictResponse({
    description:
      '모임이 코스 확정 상태가 아니어서 코스 이미지를 등록할 수 없습니다.',
  })
  storeCourseImage(
    @Param('meetingId', BigIntStringPipe) meetingId: string,
    @Query('accessToken') accessToken: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: /^image\/(jpeg|png|webp)$/,
          // MediaService performs the authoritative magic-signature check.
          skipMagicNumbersValidation: true,
        })
        .addMaxSizeValidator({ maxSize: 10 * 1024 * 1024 })
        .build({ errorHttpStatusCode: HttpStatus.BAD_REQUEST }),
    )
    file: CourseImageFile,
  ): Promise<CourseImageResponseDto> {
    return this.meetingService.storeCourseImage(meetingId, accessToken, file)
  }

  @Get(':meetingId/course-image/download')
  @Header('Cache-Control', 'private, no-store')
  @ApiParam({
    name: 'meetingId',
    description: '모임 ID',
    schema: { type: 'string', example: '1', pattern: '^\\d+$' },
  })
  @ApiQuery({
    name: 'accessToken',
    description: '모임 참여자 전용 재접속 토큰',
    example: 'member-session-token',
    required: true,
  })
  @ApiOperation({
    summary: '코스 이미지 다운로드',
    description:
      '모임에 참여한 사용자가 최초 등록된 코스 이미지를 첨부 파일로 다운로드합니다.',
  })
  @ApiProduces('image/jpeg', 'image/png', 'image/webp')
  @ApiOkResponse({
    description: '코스 이미지 바이너리',
    schema: { type: 'string', format: 'binary' },
  })
  @ApiUnauthorizedResponse({
    description: 'accessToken이 없거나 유효하지 않습니다.',
  })
  @ApiNotFoundResponse({
    description: '모임 또는 등록된 코스 이미지를 찾을 수 없습니다.',
  })
  async downloadCourseImage(
    @Param('meetingId', BigIntStringPipe) meetingId: string,
    @Query('accessToken') accessToken: string,
  ): Promise<StreamableFile> {
    const image = await this.meetingService.downloadCourseImage(
      meetingId,
      accessToken,
    )
    const extension =
      image.mimeType === 'image/jpeg' ? 'jpg' : image.mimeType.split('/')[1]
    return new StreamableFile(image.body, {
      type: image.mimeType,
      disposition: `attachment; filename="momo-course.${extension}"`,
    })
  }

  @Get(':meetingId/places/:placeId/similar')
  @ApiParam({
    name: 'meetingId',
    description: '모임 ID',
    schema: { type: 'string', example: '1', pattern: '^\\d+$' },
  })
  @ApiParam({
    name: 'placeId',
    description: '기준이 되는 장소 ID',
    schema: { type: 'string', example: '1', pattern: '^\\d+$' },
  })
  @ApiQuery({
    name: 'excludeIds',
    description:
      '추천 결과에서 제외할 장소 ID 목록(콤마로 구분). ' +
      '현재 화면에 노출 중인 추천 장소를 전달합니다.',
    required: false,
    example: '2,3,4',
  })
  @ApiQuery({
    name: 'size',
    description: '반환받을 추천 장소 개수. 미지정 시 5개',
    required: false,
    default: 5,
    example: 5,
  })
  @ApiQuery({
    name: 'accessToken',
    description: '모임 참여 시 발급된 참여자 전용 재접속 토큰',
    example: 'host-session-token',
    required: true,
  })
  @ApiOperation({
    summary: '비슷한 장소 추천',
    description:
      '기준 장소와 같은 카테고리이면서 일정 반경 이내에 있는 장소를 무작위로 추천합니다. ' +
      '모임이 장소 추천 수집 중, 코스 생성 중, 코스 생성 완료, 코스 생성 실패 상태일 때만 호출할 수 있습니다. ' +
      '신규 클라이언트는 previewPhoto를 사용하며, Google 사진은 source, attributions, googleMapsUri에 따라 표시해야 합니다.',
  })
  @ApiOkResponse({ type: SimilarPlaceResponseDto, isArray: true })
  @ApiErrorResponse(
    CommonErrorCode.validationError,
    'meetingId, placeId 형식이 올바르지 않거나 excludeIds, size 값이 유효하지 않음',
  )
  @ApiErrorResponse(
    CommonErrorCode.authenticationFailed,
    'accessToken이 없거나 유효하지 않음',
  )
  @ApiErrorResponse(
    [MeetingErrorCode.notFound, MeetingErrorCode.placeNotFound],
    '모임 또는 장소를 찾을 수 없음',
  )
  @ApiErrorResponse(
    MeetingErrorCode.similarPlacesNotRecommendable,
    '모임이 장소 추천 수집 중, 코스 생성 중, 코스 생성 완료, 코스 생성 실패 상태가 아니어서 비슷한 장소를 추천받을 수 없음',
  )
  getSimilarPlaces(
    @Param('meetingId', BigIntStringPipe) meetingId: string,
    @Param('placeId', BigIntStringPipe) placeId: string,
    @Query('accessToken') accessToken: string,
    @Query('excludeIds', BigIntStringArrayPipe) excludeIds:
      | string[]
      | undefined,
    @Query('size', new PositiveIntPipe(5)) size: number,
  ): Promise<SimilarPlaceResponseDto[]> {
    return this.meetingService.getSimilarPlaces(
      meetingId,
      placeId,
      accessToken,
      excludeIds,
      size,
    )
  }
}

@ApiTags('모임')
@Controller('meeting')
export class MeetingDetailController {
  constructor(private readonly meetingService: MeetingService) {}

  @Get(':meetingId')
  @ApiOperation({
    summary: '참여자 전용 모임 상세 조회',
    description:
      '방장과 일반 참여원이 동일하게 호출합니다. meetingId와 참여자 전용 accessToken을 함께 검증한 뒤 역할에 맞는 모임 상세 정보와 첫 만남 기준 위치를 반환합니다. 검증에 실패하면 프론트에서 초대 코드 화면으로 이동할 수 있습니다.',
  })
  @ApiParam({ name: 'meetingId', description: '모임 ID', example: '1' })
  @ApiQuery({
    name: 'accessToken',
    description: '모임 참여 시 발급된 참여자 전용 재접속 토큰',
    example: 'host-session-token',
    required: true,
  })
  @ApiOkResponse({
    description: '역할별 모임 상세 조회 성공',
    type: MeetingScreenResponseDto,
  })
  @ApiErrorResponse(
    CommonErrorCode.authenticationFailed,
    'accessToken이 없거나 유효하지 않음',
  )
  @ApiErrorResponse(MeetingErrorCode.notFound, '모임 ID가 존재하지 않음')
  getMeetingDetail(
    @Param('meetingId') meetingId: string,
    @Query('accessToken') accessToken: string,
  ) {
    return this.meetingService.getMeetingDetail(meetingId, accessToken)
  }
}
