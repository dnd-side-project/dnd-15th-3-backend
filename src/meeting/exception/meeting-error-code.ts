import { HttpStatus } from '@nestjs/common'
import { ErrorCode } from 'src/common/exception/error-code.type'

// meeting 도메인 전용 에러 코드. 도메인에 속하지 않는 에러는 CommonErrorCode에 정의
export const MeetingErrorCode = {
  notFound: {
    code: 'MEETING_NOT_FOUND',
    status: HttpStatus.NOT_FOUND,
    message: '해당 모임을 찾을 수 없습니다.',
  },
  notParticipant: {
    code: 'MEETING_ACCESS_DENIED',
    status: HttpStatus.FORBIDDEN,
    message: '해당 모임에 접근할 권한이 없습니다.',
  },
  invitationCodeIssuanceFailed: {
    code: 'MEETING_INVITATION_CODE_ISSUANCE_FAILED',
    status: HttpStatus.SERVICE_UNAVAILABLE,
    message: '초대 코드를 발급하지 못했습니다.',
  },
  meetingTypeNotFound: {
    code: 'MEETING_TYPE_NOT_FOUND',
    status: HttpStatus.NOT_FOUND,
    message: '모임 유형을 찾을 수 없습니다.',
  },
  invalidCourseCategory: {
    code: 'MEETING_INVALID_COURSE_CATEGORY',
    status: HttpStatus.BAD_REQUEST,
    message: '존재하지 않는 코스 카테고리가 포함되어 있습니다.',
  },
  invitationNotFound: {
    code: 'MEETING_INVITATION_NOT_FOUND',
    status: HttpStatus.NOT_FOUND,
    message: '유효한 초대 코드를 찾을 수 없습니다.',
  },
  nicknameAlreadyInUse: {
    code: 'MEETING_NICKNAME_ALREADY_IN_USE',
    status: HttpStatus.CONFLICT,
    message: '이미 사용 중인 닉네임입니다.',
  },
  hostOnly: {
    code: 'MEETING_HOST_ONLY',
    status: HttpStatus.FORBIDDEN,
    message: '방장만 수행할 수 있는 작업입니다.',
  },
  staleCoursePlan: {
    code: 'MEETING_STALE_COURSE_PLAN',
    status: HttpStatus.CONFLICT,
    message: '오래된 코스 계획입니다. 최신 계획을 다시 조회해주세요.',
  },
  locationNotFound: {
    code: 'MEETING_LOCATION_NOT_FOUND',
    status: HttpStatus.NOT_FOUND,
    message: '모임 기준 위치를 찾을 수 없습니다.',
  },
  placeNotFound: {
    code: 'MEETING_PLACE_NOT_FOUND',
    status: HttpStatus.NOT_FOUND,
    message: '장소를 찾을 수 없습니다.',
  },
  placeCategoryMismatch: {
    code: 'MEETING_PLACE_CATEGORY_MISMATCH',
    status: HttpStatus.BAD_REQUEST,
    message: '현재 모임에서 선택한 코스 카테고리의 장소만 추가할 수 있습니다.',
  },
  placeOutsideRange: {
    code: 'MEETING_PLACE_OUTSIDE_RANGE',
    status: HttpStatus.BAD_REQUEST,
    message: '모임 기준 위치에서 2km 이내의 장소만 추가할 수 있습니다.',
  },
  recommendationAlreadyExists: {
    code: 'MEETING_RECOMMENDATION_ALREADY_EXISTS',
    status: HttpStatus.CONFLICT,
    message: '이미 모임에 추가된 장소입니다.',
  },
  courseImageStateInvalid: {
    code: 'MEETING_COURSE_IMAGE_STATE_INVALID',
    status: HttpStatus.CONFLICT,
    message: '코스가 확정된 모임에서만 코스 이미지를 등록할 수 있습니다.',
  },
  courseImageNotFound: {
    code: 'MEETING_COURSE_IMAGE_NOT_FOUND',
    status: HttpStatus.NOT_FOUND,
    message: '아직 생성된 코스 이미지가 없습니다.',
  },
} as const satisfies Record<string, ErrorCode>
