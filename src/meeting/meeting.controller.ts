import {
  Body,
  Controller,
  Get,
  NotImplementedException,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common'
import {
  ApiBadRequestResponse,
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
} from '@nestjs/swagger'
import { MAX_COURSE_STEPS } from 'src/category/category.constants'
import { CoursePlanResponseDto } from './dto/course-plan-response.dto'
import { CreateMeetingDto } from './dto/create-meeting.dto'
import { InvitationPreviewRequestDto } from './dto/invitation-preview-request.dto'
import { JoinMeetingDto } from './dto/join-meeting.dto'
import { MeetingInvitationResponseDto } from './dto/meeting-invitation-response.dto'
import { MeetingScreenResponseDto } from './dto/meeting-screen-response.dto'
import { UpdateCoursePlanDto } from './dto/update-course-plan.dto'

@ApiTags('모임')
@ApiResponse({
  status: 501,
  description: '실제 데이터 연동 전까지 제공되지 않는 API입니다.',
})
@Controller('meetings')
export class MeetingController {
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
  @ApiBadRequestResponse({
    description: '필수 입력값 또는 날짜/시간 형식이 올바르지 않습니다.',
  })
  createMeeting(@Body() _dto: CreateMeetingDto): never {
    throw new NotImplementedException(
      '모임 생성 API는 실제 데이터 연동 후 제공됩니다.',
    )
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
  @ApiUnauthorizedResponse({
    description: 'accessToken이 없거나 유효하지 않습니다.',
  })
  @ApiNotFoundResponse({ description: '모임 ID가 존재하지 않습니다.' })
  getCoursePlan(
    @Param('meetingId') _meetingId: string,
    @Query('accessToken') _accessToken: string,
  ): never {
    throw new NotImplementedException(
      '코스 계획 API는 실제 데이터 연동 후 제공됩니다.',
    )
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
  @ApiBadRequestResponse({
    description: `코스 카테고리가 ${MAX_COURSE_STEPS}개를 초과했습니다.`,
  })
  @ApiUnauthorizedResponse({
    description: 'accessToken이 없거나 유효하지 않습니다.',
  })
  @ApiForbiddenResponse({
    description: '방장만 코스 계획을 수정할 수 있습니다.',
  })
  @ApiNotFoundResponse({ description: '모임 ID가 존재하지 않습니다.' })
  @ApiConflictResponse({
    description:
      '오래된 version으로 저장을 시도했습니다. 최신 계획을 다시 조회하세요.',
  })
  updateCoursePlan(
    @Param('meetingId') _meetingId: string,
    @Query('accessToken') _accessToken: string,
    @Body() _dto: UpdateCoursePlanDto,
  ): never {
    throw new NotImplementedException(
      '코스 계획 API는 실제 데이터 연동 후 제공됩니다.',
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
  @ApiBadRequestResponse({
    description: '초대 코드가 비어 있거나 6자리 형식이 아닙니다.',
  })
  @ApiNotFoundResponse({
    description:
      '유효하지 않거나 삭제된 초대 코드입니다. 초대 코드 오류 화면으로 이동합니다.',
  })
  previewInvitation(@Body() _dto: InvitationPreviewRequestDto): never {
    throw new NotImplementedException(
      '초대 코드 미리보기 API는 실제 데이터 연동 후 제공됩니다.',
    )
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
  @ApiBadRequestResponse({
    description: '초대 코드 형식 또는 프로필 입력이 올바르지 않습니다.',
  })
  @ApiNotFoundResponse({
    description: '유효하지 않거나 삭제된 초대 코드입니다.',
  })
  @ApiConflictResponse({
    description: '다른 사용자 키와 중복된 닉네임 등 참여 제약에 걸렸습니다.',
  })
  joinMeeting(@Body() _dto: JoinMeetingDto): never {
    throw new NotImplementedException(
      '모임 참여 API는 실제 데이터 연동 후 제공됩니다.',
    )
  }
}

@ApiTags('모임')
@ApiResponse({
  status: 501,
  description: '실제 데이터 연동 전까지 제공되지 않는 API입니다.',
})
@Controller('meeting')
export class MeetingDetailController {
  @Get(':meetingId')
  @ApiOperation({
    summary: '참여자 전용 모임 상세 조회',
    description:
      '방장과 일반 참여원이 동일하게 호출합니다. meetingId와 참여자 전용 accessToken을 함께 검증한 뒤 역할에 맞는 모임 상세 정보와 공통 placeId를 반환합니다. 검증에 실패하면 프론트에서 초대 코드 화면으로 이동할 수 있습니다.',
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
  @ApiUnauthorizedResponse({
    description:
      'accessToken이 없거나 유효하지 않아 초대 코드 화면으로 이동해야 합니다.',
  })
  @ApiNotFoundResponse({ description: '모임 ID가 존재하지 않습니다.' })
  getMeetingDetail(
    @Param('meetingId') _meetingId: string,
    @Query('accessToken') _accessToken: string,
  ): never {
    throw new NotImplementedException(
      '모임 상세 API는 실제 데이터 연동 후 제공됩니다.',
    )
  }
}
