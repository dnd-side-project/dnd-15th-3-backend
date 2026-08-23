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
  recommendationNotFound: {
    code: 'MEETING_RECOMMENDATION_NOT_FOUND',
    status: HttpStatus.NOT_FOUND,
    message: '추천 장소를 찾을 수 없습니다.',
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
  confirmedCourseCandidateNotFound: {
    code: 'MEETING_CONFIRMED_COURSE_CANDIDATE_NOT_FOUND',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: '확정된 모임인데 선택된 코스 후보를 찾을 수 없습니다.',
  },
  meetingLocationDataMissing: {
    code: 'MEETING_LOCATION_DATA_MISSING',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message:
      '모임은 존재하지만 시작지 정보를 찾을 수 없는 데이터 정합성 오류입니다.',
  },
  courseCategoryStepsDataMissing: {
    code: 'MEETING_COURSE_CATEGORY_STEPS_DATA_MISSING',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message:
      '모임은 존재하지만 방문 순서(카테고리 단계)를 찾을 수 없는 데이터 정합성 오류입니다.',
  },
  courseCandidatesNotVisible: {
    code: 'MEETING_COURSE_CANDIDATES_NOT_VISIBLE',
    status: HttpStatus.CONFLICT,
    message:
      '모임이 코스 생성 완료 상태가 아니어서 코스 후보 목록을 조회할 수 없습니다.',
  },
  courseDetailNotVisible: {
    code: 'MEETING_COURSE_DETAIL_NOT_VISIBLE',
    status: HttpStatus.CONFLICT,
    message:
      '모임이 코스 생성 완료 상태도 확정 상태도 아니어서 코스 상세를 조회할 수 없습니다.',
  },
  courseCommentsNotVisible: {
    code: 'MEETING_COURSE_COMMENTS_NOT_VISIBLE',
    status: HttpStatus.CONFLICT,
    message:
      '모임이 코스 생성 완료 상태가 아니어서 코스 댓글 목록을 조회할 수 없습니다.',
  },
  courseCommentNotCreatable: {
    code: 'MEETING_COURSE_COMMENT_NOT_CREATABLE',
    status: HttpStatus.CONFLICT,
    message: '모임이 코스 생성 완료 상태가 아니어서 댓글을 작성할 수 없습니다.',
  },
  excludedPlacesNotVisible: {
    code: 'MEETING_EXCLUDED_PLACES_NOT_VISIBLE',
    status: HttpStatus.CONFLICT,
    message:
      '모임이 코스 생성 완료 상태가 아니어서 제외된 장소 목록을 조회할 수 없습니다.',
  },
  coursePlaceNotAddable: {
    code: 'MEETING_COURSE_PLACE_NOT_ADDABLE',
    status: HttpStatus.CONFLICT,
    message:
      '모임이 코스 생성 완료 상태가 아니어서 코스에 장소를 추가할 수 없습니다.',
  },
  coursePlacesNotReplaceable: {
    code: 'MEETING_COURSE_PLACES_NOT_REPLACEABLE',
    status: HttpStatus.CONFLICT,
    message: '모임이 코스 생성 완료 상태가 아니어서 코스를 수정할 수 없습니다.',
  },
  courseNotConfirmable: {
    code: 'MEETING_COURSE_NOT_CONFIRMABLE',
    status: HttpStatus.CONFLICT,
    message: '모임이 코스 생성 완료 상태가 아니어서 코스를 확정할 수 없습니다.',
  },
  courseNotGeneratable: {
    code: 'MEETING_COURSE_NOT_GENERATABLE',
    status: HttpStatus.CONFLICT,
    message: '현재 모임 상태에서는 코스를 생성할 수 없습니다.',
  },
  mapPinsNotVisible: {
    code: 'MEETING_MAP_PINS_NOT_VISIBLE',
    status: HttpStatus.CONFLICT,
    message:
      '모임이 코스 생성 완료 또는 확정된 상태여서 지도 핀을 조회할 수 없습니다.',
  },
  placePreferenceNotEditable: {
    code: 'MEETING_PLACE_PREFERENCE_NOT_EDITABLE',
    status: HttpStatus.CONFLICT,
    message:
      '모임이 코스 생성 중이거나 코스가 확정된 상태여서 반응을 변경할 수 없습니다.',
  },
  similarPlacesNotRecommendable: {
    code: 'MEETING_SIMILAR_PLACES_NOT_RECOMMENDABLE',
    status: HttpStatus.CONFLICT,
    message:
      '모임이 장소 추천 수집 중, 코스 생성 중, 코스 생성 완료, 코스 생성 실패 상태가 아니어서 비슷한 장소를 추천받을 수 없습니다.',
  },
  courseConfirmHostOnly: {
    code: 'MEETING_COURSE_CONFIRM_HOST_ONLY',
    status: HttpStatus.FORBIDDEN,
    message: '방장만 코스를 확정할 수 있습니다.',
  },
  courseEditHostOnly: {
    code: 'MEETING_COURSE_EDIT_HOST_ONLY',
    status: HttpStatus.FORBIDDEN,
    message: '방장만 코스를 편집할 수 있습니다.',
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
