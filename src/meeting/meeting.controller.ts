import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
  UsePipes,
} from '@nestjs/common'
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiPropertyOptional,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger'
import { MAX_COURSE_STEPS } from 'src/category/category.constants'
import { CategorySlug } from 'src/category/enums/category-slug.enum'
import type { ParticipantRequest } from 'src/common/auth/participant-context'
import { HostGuard } from 'src/common/guards/host.guard'
import { ParticipantAccessTokenGuard } from 'src/common/guards/participant-access-token.guard'
import { ZodValidationPipe } from 'src/common/pipes/zod-validation.pipe'
import { MockApiService } from 'src/mock/mock-api.service'
import { MeetingTypeCode } from './enums/meeting-type-code.enum'
import {
  createMeetingRequestSchema,
  invitationPreviewRequestSchema,
  joinMeetingRequestSchema,
  updateCoursePlanRequestSchema,
} from './schemas/meeting-request.schema'

const PARTICIPANT_UNAUTHORIZED_DESCRIPTION =
  'Authorization Bearer 참여자 토큰이 없거나 유효하지 않습니다. MOCK_API_ENABLED=true에서는 deprecated query accessToken을 임시 호환 경로로 사용할 수 있습니다. 세션·쿠키 만료의 구체적인 정책은 별도 확정 후 반영합니다.'
const HOST_FORBIDDEN_DESCRIPTION =
  '참여자 인증은 성공했지만 방장 역할이 아니어서 요청을 수행할 수 없습니다.'

class ParticipantProfileDto {
  @ApiProperty({
    description: '클라이언트가 보관하는 익명 사용자 키',
    example: 'device-2d60e2dc',
  })
  userKey!: string

  @ApiProperty({ description: '모임에서 사용할 닉네임', example: '모모' })
  nickname!: string

  @ApiPropertyOptional({
    description: '선택한 캐릭터 이미지의 객체 키',
    example: 'profiles/momo-01.png',
  })
  profileImageKey?: string
}

class CreateMeetingDto {
  @ApiProperty({
    description: '모임 유형 코드',
    enum: MeetingTypeCode,
    enumName: 'MeetingTypeCode',
    example: MeetingTypeCode.Social,
  })
  meetingTypeCode!: MeetingTypeCode

  @ApiProperty({ description: '모임 이름', example: '성수 브런치 모임' })
  name!: string

  @ApiProperty({ description: '모임 날짜(YYYY-MM-DD)', example: '2026-08-23' })
  date!: string

  @ApiProperty({ description: '모임 시간(HH:mm)', example: '12:00' })
  time!: string

  @ApiProperty({ description: '첫 만남 장소 ID', example: '101' })
  firstLocationPlaceId!: string

  @ApiProperty({
    description: '코스 카테고리 슬러그 목록. 배열 순서가 코스 진행 순서입니다.',
    enum: CategorySlug,
    enumName: 'CategorySlug',
    isArray: true,
    minItems: 1,
    maxItems: MAX_COURSE_STEPS,
    uniqueItems: true,
    example: [CategorySlug.Restaurant, CategorySlug.Cafe, CategorySlug.Bar],
  })
  categorySlugs!: CategorySlug[]

  @ApiProperty({ description: '방장 프로필', type: ParticipantProfileDto })
  host!: ParticipantProfileDto
}

class JoinMeetingDto extends ParticipantProfileDto {
  @ApiProperty({ description: '초대 코드 6자리', example: 'DNDFOR' })
  accessToken!: string
}

class MeetingResponseDto {
  @ApiProperty({ description: '모임 ID', example: '1' })
  id!: string

  @ApiProperty({ description: '모임 ID', example: '1', deprecated: true })
  meetingId!: string

  @ApiProperty({ description: '초대 코드', example: 'DNDFOR' })
  accessToken!: string

  @ApiProperty({
    description:
      '생성자/참여자에게 발급하는 참여자 전용 재접속 토큰. 초대 코드를 대신해 상세 조회에 사용합니다.',
    example: 'member-session-token',
  })
  participantAccessToken!: string

  @ApiProperty({
    description: '초대 링크',
    example: 'https://momo.example/invite/DNDFOR',
  })
  invitationUrl!: string

  @ApiProperty({ description: '모임 이름', example: '성수 브런치 모임' })
  name!: string

  @ApiProperty({ description: '모임 날짜', example: '2026-08-23' })
  date!: string

  @ApiProperty({ description: '모임 시간', example: '12:00' })
  time!: string
}

class MeetingInvitationResponseDto {
  @ApiProperty({ description: '모임 ID', example: '1' })
  meetingId!: string

  @ApiProperty({ description: '초대 코드', example: 'DNDFOR' })
  accessToken!: string

  @ApiProperty({
    description: '초대 링크',
    example: 'https://momo.example/invite/DNDFOR',
  })
  invitationUrl!: string

  @ApiProperty({ description: '모임 이름', example: '성수 브런치 모임' })
  name!: string

  @ApiProperty({ description: '모임 날짜', example: '2026-08-23' })
  date!: string

  @ApiProperty({ description: '모임 시간', example: '12:00' })
  time!: string

  @ApiProperty({ description: '모임의 첫 장소 ID', example: '101' })
  placeId!: string
}

class InvitationPreviewRequestDto {
  @ApiProperty({
    description:
      '사용자가 입력한 6자리 초대 코드. 참여자 재접속 토큰과는 다른 값입니다.',
    example: 'DNDFOR',
  })
  accessToken!: string
}

class MeetingTypeSummaryDto {
  @ApiProperty({ description: '모임 유형 ID', example: '1' })
  id!: string

  @ApiProperty({
    description: '모임 유형 코드',
    enum: MeetingTypeCode,
    enumName: 'MeetingTypeCode',
    example: MeetingTypeCode.Social,
  })
  code!: MeetingTypeCode

  @ApiProperty({ description: '모임 유형명', example: '친목' })
  name!: string
}

class PlaceSummaryDto {
  @ApiProperty({ description: '장소 ID', example: '101' })
  id!: string

  @ApiProperty({ description: '장소명', example: '성수역 3번 출구' })
  name!: string

  @ApiProperty({ description: '주소', example: '서울 성동구 성수이로 1' })
  address!: string

  @ApiProperty({ description: '위도', example: 37.5446 })
  latitude!: number

  @ApiProperty({ description: '경도', example: 127.0557 })
  longitude!: number
}

class MeetingParticipantResponseDto {
  @ApiProperty({ description: '참여자 ID', example: '12' })
  id!: string

  @ApiProperty({ description: '닉네임', example: '지니' })
  nickname!: string

  @ApiProperty({
    description: '역할',
    enum: ['HOST', 'MEMBER'],
    example: 'MEMBER',
  })
  role!: 'HOST' | 'MEMBER'

  @ApiProperty({
    description: '선택한 캐릭터 이미지 키',
    example: 'avatars/momo-yellow.png',
  })
  profileImageKey!: string
}

class CourseCategoryStepResponseDto {
  @ApiProperty({ description: '카테고리 ID', example: '1' })
  id!: string

  @ApiProperty({ description: '카테고리명', example: '카페' })
  name!: string

  @ApiProperty({
    description: '카테고리 슬러그',
    enum: CategorySlug,
    enumName: 'CategorySlug',
    example: CategorySlug.Cafe,
  })
  slug!: CategorySlug

  @ApiProperty({ description: '코스 순서', example: 1 })
  order!: number
}

class UpdateCoursePlanDto {
  @ApiProperty({
    description:
      '저장할 코스 카테고리 슬러그 목록. 배열 순서가 코스 진행 순서입니다. 비우면 코스를 모두 삭제합니다.',
    enum: CategorySlug,
    enumName: 'CategorySlug',
    isArray: true,
    minItems: 0,
    maxItems: MAX_COURSE_STEPS,
    uniqueItems: true,
    example: [CategorySlug.Restaurant, CategorySlug.Cafe, CategorySlug.Bar],
  })
  categorySlugs!: CategorySlug[]

  @ApiProperty({
    description: '조회한 코스 버전. 다른 변경이 먼저 저장되면 충돌 처리합니다.',
    example: 1,
    minimum: 1,
  })
  version!: number
}

class CoursePlanResponseDto {
  @ApiProperty({ description: '모임 ID', example: '1' })
  meetingId!: string

  @ApiProperty({
    description: '허용되는 최대 코스 수',
    example: MAX_COURSE_STEPS,
  })
  maxSteps!: number

  @ApiProperty({ description: '현재 코스 버전', example: 1 })
  version!: number

  @ApiProperty({
    description: '현재 선택된 코스 카테고리와 순서',
    type: CourseCategoryStepResponseDto,
    isArray: true,
  })
  categorySteps!: CourseCategoryStepResponseDto[]
}

class RecommendationPreviewDto {
  @ApiProperty({ description: '추천 ID', example: '21' })
  id!: string

  @ApiProperty({ description: '카테고리 ID', example: '1' })
  categoryId!: string

  @ApiProperty({ description: '추천 장소', type: PlaceSummaryDto })
  place!: PlaceSummaryDto

  @ApiProperty({ description: '추천자 참여자 ID', example: '11' })
  recommendedByParticipantId!: string

  @ApiProperty({ description: '좋아요 수', example: 2 })
  likeCount!: number

  @ApiProperty({ description: '싫어요 수', example: 0 })
  dislikeCount!: number

  @ApiPropertyOptional({
    description: '현재 사용자의 선택',
    enum: ['LIKE', 'DISLIKE'],
    nullable: true,
    example: 'LIKE',
  })
  viewerPreference!: 'LIKE' | 'DISLIKE' | null
}

class SelectedCourseResponseDto {
  @ApiProperty({ description: '선정된 코스 후보 ID', example: '41' })
  id!: string

  @ApiProperty({
    description: '코스를 구성하는 추천 ID 목록. 배열 순서가 이동 순서입니다.',
    example: ['21', '22'],
  })
  recommendationIds!: string[]
}

class MeetingPermissionsResponseDto {
  @ApiProperty({
    description: '모임 설정을 변경할 수 있는지 여부',
    example: true,
  })
  canManageMeeting!: boolean

  @ApiProperty({
    description: '코스 후보를 확정할 수 있는지 여부',
    example: true,
  })
  canSelectCourse!: boolean

  @ApiProperty({
    description: '초대 코드를 확인·공유할 수 있는지 여부',
    example: true,
  })
  canShareInvitation!: boolean
}

class MeetingScreenResponseDto extends MeetingResponseDto {
  @ApiProperty({
    description: '현재 요청자의 모임 내 역할',
    enum: ['HOST', 'MEMBER'],
    example: 'HOST',
  })
  role!: 'HOST' | 'MEMBER'

  @ApiProperty({ description: '현재 요청자가 방장인지 여부', example: true })
  isHost!: boolean

  @ApiProperty({
    description: '화면에서 공통으로 사용하는 첫 장소 ID',
    example: '101',
  })
  placeId!: string

  @ApiProperty({
    description: '역할별 화면 액션 권한',
    type: MeetingPermissionsResponseDto,
  })
  permissions!: MeetingPermissionsResponseDto

  @ApiProperty({ description: '모임 유형', type: MeetingTypeSummaryDto })
  meetingType!: MeetingTypeSummaryDto

  @ApiProperty({ description: '첫 만남 장소', type: PlaceSummaryDto })
  firstLocation!: PlaceSummaryDto

  @ApiProperty({ description: '현재 사용자의 참여자 ID', example: '12' })
  viewerParticipantId!: string

  @ApiProperty({
    description: '참여자 목록',
    type: MeetingParticipantResponseDto,
    isArray: true,
  })
  participants!: MeetingParticipantResponseDto[]

  @ApiProperty({
    description: '선택한 코스 카테고리와 순서',
    type: CourseCategoryStepResponseDto,
    isArray: true,
  })
  categorySteps!: CourseCategoryStepResponseDto[]

  @ApiProperty({
    description: '화면에 표시할 추천 장소',
    type: RecommendationPreviewDto,
    isArray: true,
  })
  recommendations!: RecommendationPreviewDto[]

  @ApiPropertyOptional({
    description: '선정된 코스. 아직 선정 전이면 null',
    type: () => SelectedCourseResponseDto,
    nullable: true,
    example: null,
  })
  selectedCourse!: SelectedCourseResponseDto | null
}

function getParticipantAccessToken(
  request: ParticipantRequest | undefined,
  deprecatedQueryToken: string | undefined,
): string {
  const accessToken = request?.participant?.accessToken ?? deprecatedQueryToken
  if (!accessToken) {
    throw new UnauthorizedException('유효한 참여자 토큰이 필요합니다.')
  }

  return accessToken
}

@ApiTags('모임')
@ApiResponse({
  status: 501,
  description: 'MOCK_API_ENABLED=false에서는 아직 구현되지 않은 API입니다.',
})
@Controller('meetings')
export class MeetingController {
  constructor(private readonly mockApi: MockApiService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(createMeetingRequestSchema))
  @ApiOperation({
    summary: '모임 생성',
    description:
      '호스트 온보딩의 모임 유형·장소·카테고리·날짜/시간·프로필 입력을 한 번에 저장하고 초대 코드를 발급합니다.',
  })
  @ApiCreatedResponse({
    description: '모임 생성 및 방장 참여 성공',
    type: MeetingScreenResponseDto,
  })
  @ApiBadRequestResponse({
    description: '필수 입력값 또는 날짜/시간 형식이 올바르지 않습니다.',
  })
  createMeeting(@Body() dto: CreateMeetingDto) {
    this.mockApi.requireEnabled()
    const meeting = this.mockApi.createMeeting(dto.categorySlugs)
    if (meeting === 'BAD_REQUEST') {
      throw new BadRequestException(
        `코스는 중복 없이 최대 ${MAX_COURSE_STEPS}개까지 선택할 수 있습니다.`,
      )
    }
    return meeting
  }

  @Get(':meetingId/course-plan')
  @ApiBearerAuth()
  @UseGuards(ParticipantAccessTokenGuard)
  @ApiOperation({
    summary: '코스 계획 조회',
    description:
      '현재 선택된 카테고리와 순서를 조회합니다. 코스 순서는 categorySteps 배열 순서와 order로 표현됩니다.',
  })
  @ApiParam({ name: 'meetingId', description: '모임 ID', example: '1' })
  @ApiQuery({
    name: 'accessToken',
    description:
      'Deprecated: MOCK_API_ENABLED=true에서만 지원하는 query 토큰 호환 경로입니다. Authorization Bearer를 우선 사용하세요.',
    example: 'host-session-token',
    required: false,
    deprecated: true,
  })
  @ApiOkResponse({
    description: '코스 계획 조회 성공',
    type: CoursePlanResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: PARTICIPANT_UNAUTHORIZED_DESCRIPTION,
  })
  @ApiNotFoundResponse({ description: '모임 ID가 존재하지 않습니다.' })
  getCoursePlan(
    @Param('meetingId') meetingId: string,
    @Query('accessToken') accessToken: string | undefined,
    @Req() request?: ParticipantRequest,
  ) {
    this.mockApi.requireEnabled()
    const participantAccessToken = getParticipantAccessToken(
      request,
      accessToken,
    )
    const coursePlan = this.mockApi.getCoursePlan(
      meetingId,
      participantAccessToken,
    )
    if (coursePlan === 'NOT_FOUND') {
      throw new NotFoundException('모임을 찾을 수 없습니다.')
    }
    if (!coursePlan) {
      throw new UnauthorizedException('유효하지 않은 참여자 accessToken입니다.')
    }
    return coursePlan
  }

  @Put(':meetingId/course-plan')
  @ApiBearerAuth()
  @UseGuards(ParticipantAccessTokenGuard, HostGuard)
  @UsePipes(new ZodValidationPipe(updateCoursePlanRequestSchema))
  @ApiOperation({
    summary: '코스 계획 전체 저장',
    description:
      '추가·삭제·순서 변경 결과를 현재 전체 배열로 교체합니다. Drag & drop 중간 이벤트가 아니라 저장 시점에 호출합니다.',
  })
  @ApiParam({ name: 'meetingId', description: '모임 ID', example: '1' })
  @ApiQuery({
    name: 'accessToken',
    description:
      'Deprecated: MOCK_API_ENABLED=true에서만 지원하는 query 토큰 호환 경로입니다. Authorization Bearer를 우선 사용하세요.',
    example: 'host-session-token',
    required: false,
    deprecated: true,
  })
  @ApiOkResponse({
    description: '코스 계획 저장 성공',
    type: CoursePlanResponseDto,
  })
  @ApiBadRequestResponse({
    description: `카테고리가 중복되었거나 ${MAX_COURSE_STEPS}개를 초과했습니다.`,
  })
  @ApiUnauthorizedResponse({
    description: PARTICIPANT_UNAUTHORIZED_DESCRIPTION,
  })
  @ApiForbiddenResponse({
    description: HOST_FORBIDDEN_DESCRIPTION,
  })
  @ApiNotFoundResponse({ description: '모임 ID가 존재하지 않습니다.' })
  @ApiConflictResponse({
    description:
      '오래된 version으로 저장을 시도했습니다. 최신 계획을 다시 조회하세요.',
  })
  updateCoursePlan(
    @Param('meetingId') meetingId: string,
    @Query('accessToken') accessToken: string | undefined,
    @Body() dto: UpdateCoursePlanDto,
    @Req() request?: ParticipantRequest,
  ) {
    this.mockApi.requireEnabled()
    const participantAccessToken = getParticipantAccessToken(
      request,
      accessToken,
    )
    const coursePlan = this.mockApi.updateCoursePlan(
      meetingId,
      participantAccessToken,
      dto.categorySlugs,
      dto.version,
    )
    if (coursePlan === 'NOT_FOUND') {
      throw new NotFoundException('모임을 찾을 수 없습니다.')
    }
    if (coursePlan === 'UNAUTHORIZED') {
      throw new UnauthorizedException('유효하지 않은 참여자 accessToken입니다.')
    }
    if (coursePlan === 'FORBIDDEN') {
      throw new ForbiddenException('방장만 코스 계획을 수정할 수 있습니다.')
    }
    if (coursePlan === 'CONFLICT') {
      throw new ConflictException(
        '최신 코스 계획을 조회한 뒤 다시 저장해주세요.',
      )
    }
    if (coursePlan === 'BAD_REQUEST') {
      throw new BadRequestException(
        `코스는 중복 없이 최대 ${MAX_COURSE_STEPS}개까지 선택할 수 있습니다.`,
      )
    }
    return coursePlan
  }

  @Post('invitation/preview')
  @UsePipes(new ZodValidationPipe(invitationPreviewRequestSchema))
  @ApiOperation({
    summary: '초대 코드 검증 및 모임 미리보기',
    description:
      '초대 코드 입력 화면에서 호출합니다. 코드가 유효하면 모임 정보를 반환하고, 이후 프로필 입력·참여 단계로 이동할 수 있습니다. 이 단계에서는 아직 참여자 전용 토큰을 발급하지 않습니다.',
  })
  @ApiOkResponse({
    description: '초대 코드 검증 및 모임 미리보기 성공',
    type: MeetingInvitationResponseDto,
  })
  @ApiBadRequestResponse({
    description: '초대 코드가 비어 있거나 6자리 형식이 아닙니다.',
  })
  @ApiNotFoundResponse({
    description:
      '유효하지 않거나 삭제된 초대 코드입니다. 초대 코드 오류 화면으로 이동합니다.',
  })
  previewInvitation(@Body() dto: InvitationPreviewRequestDto) {
    this.mockApi.requireEnabled()
    const meeting = this.mockApi.getInvitationPreview(dto.accessToken)
    if (!meeting) {
      throw new NotFoundException('유효하지 않거나 삭제된 초대 코드입니다.')
    }
    return meeting
  }

  @Post('join')
  @UsePipes(new ZodValidationPipe(joinMeetingRequestSchema))
  @ApiOperation({
    summary: '모임 참여',
    description:
      '게스트가 초대 코드를 입력하고 프로필을 선택한 뒤 모임에 참여합니다. 동일한 사용자의 재시도는 기존 참여자를 반환합니다.',
  })
  @ApiCreatedResponse({
    description: '모임 참여 성공',
    type: MeetingScreenResponseDto,
  })
  @ApiBadRequestResponse({
    description: '초대 코드 형식 또는 프로필 입력이 올바르지 않습니다.',
  })
  @ApiNotFoundResponse({
    description: '유효하지 않거나 삭제된 초대 코드입니다.',
  })
  @ApiConflictResponse({
    description: '다른 사용자 키와 중복된 닉네임 등 참여 제약에 걸렸습니다.',
  })
  joinMeeting(@Body() dto: JoinMeetingDto) {
    this.mockApi.requireEnabled()
    const meeting = this.mockApi.joinMeeting(dto.accessToken)
    if (!meeting) {
      throw new NotFoundException('유효하지 않거나 삭제된 초대 코드입니다.')
    }
    return meeting
  }
}

@ApiTags('모임')
@ApiResponse({
  status: 501,
  description: 'MOCK_API_ENABLED=false에서는 아직 구현되지 않은 API입니다.',
})
@Controller('meeting')
export class MeetingDetailController {
  constructor(private readonly mockApi: MockApiService) {}

  @Get(':meetingId')
  @ApiBearerAuth()
  @UseGuards(ParticipantAccessTokenGuard)
  @ApiOperation({
    summary: '참여자 전용 모임 상세 조회',
    description:
      '방장과 일반 참여원이 동일하게 호출합니다. meetingId와 참여자 전용 accessToken을 함께 검증한 뒤 역할에 맞는 모임 상세 정보와 공통 placeId를 반환합니다. 검증에 실패하면 프론트에서 초대 코드 화면으로 이동할 수 있습니다.',
  })
  @ApiParam({ name: 'meetingId', description: '모임 ID', example: '1' })
  @ApiQuery({
    name: 'accessToken',
    description:
      'Deprecated: MOCK_API_ENABLED=true에서만 지원하는 query 토큰 호환 경로입니다. Authorization Bearer를 우선 사용하세요.',
    example: 'host-session-token',
    required: false,
    deprecated: true,
  })
  @ApiOkResponse({
    description: '역할별 모임 상세 조회 성공',
    type: MeetingScreenResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: PARTICIPANT_UNAUTHORIZED_DESCRIPTION,
  })
  @ApiNotFoundResponse({ description: '모임 ID가 존재하지 않습니다.' })
  getMeetingDetail(
    @Param('meetingId') meetingId: string,
    @Query('accessToken') accessToken: string | undefined,
    @Req() request?: ParticipantRequest,
  ) {
    this.mockApi.requireEnabled()
    const participantAccessToken = getParticipantAccessToken(
      request,
      accessToken,
    )
    const detail = this.mockApi.getMeetingDetail(
      meetingId,
      participantAccessToken,
    )
    if (detail === 'NOT_FOUND') {
      throw new NotFoundException('모임을 찾을 수 없습니다.')
    }
    if (!detail) {
      throw new UnauthorizedException(
        '유효하지 않은 참여자 accessToken입니다. 초대 코드 화면으로 이동해주세요.',
      )
    }
    return detail
  }
}
