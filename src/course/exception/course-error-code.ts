import { HttpStatus } from '@nestjs/common'
import { MAX_COURSE_STEPS } from 'src/category/category.constants'
import type { ErrorCode } from 'src/common/exception/error-code.type'

export const CourseErrorCode = {
  courseCandidatesMissing: {
    code: 'COURSE_CANDIDATES_MISSING',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message:
      '코스 생성이 완료된 모임인데 코스 후보를 찾을 수 없는 데이터 정합성 오류입니다.',
  },
  candidateNotFound: {
    code: 'COURSE_CANDIDATE_NOT_FOUND',
    status: HttpStatus.NOT_FOUND,
    message: '코스 후보를 찾을 수 없습니다.',
  },
  routeMissing: {
    code: 'COURSE_ROUTE_MISSING',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message:
      '코스 후보가 존재하는데 코스 경로를 찾을 수 없는 데이터 정합성 오류입니다.',
  },
  recommendationNotFound: {
    code: 'COURSE_RECOMMENDATION_NOT_FOUND',
    status: HttpStatus.NOT_FOUND,
    message: '장소 추천을 찾을 수 없습니다.',
  },
  alreadyIncludedInCourse: {
    code: 'COURSE_PLACE_ALREADY_INCLUDED',
    status: HttpStatus.CONFLICT,
    message: '이미 코스에 포함된 장소입니다.',
  },
  courseStepsFull: {
    code: 'COURSE_STEPS_FULL',
    status: HttpStatus.CONFLICT,
    message: `코스에 이미 장소가 ${MAX_COURSE_STEPS}개 있어서 추가할 수 없습니다.`,
  },
  walkingCourseUnavailable: {
    code: 'COURSE_WALKING_COURSE_UNAVAILABLE',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message:
      '코스를 편집하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  },
} as const satisfies Record<string, ErrorCode>
