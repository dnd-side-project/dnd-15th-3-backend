import { ApiProperty } from '@nestjs/swagger'
import { CategorySlug } from 'src/category/enums/category-slug.enum'
import { MeetingTypeCode } from 'src/meeting/enums/meeting-type-code.enum'
import { CourseCategoryStepResponseDto } from './course-category-step-response.dto'
import { MeetingLocationResponseDto } from './meeting-location.dto'
import { MeetingParticipantResponseDto } from './meeting-participant-response.dto'
import { MeetingPermissionsResponseDto } from './meeting-permissions-response.dto'
import { MeetingResponseDto } from './meeting-response.dto'
import { MeetingTypeSummaryDto } from './meeting-type-summary.dto'
import { ParticipantProfileDto } from './participant-profile.dto'
import { RecommendationPreviewDto } from './recommendation-preview.dto'
import { SelectedCourseResponseDto } from './selected-course-response.dto'

export class MeetingScreenResponseDto extends MeetingResponseDto {
  @ApiProperty({
    description: '확정된 코스 이미지의 공개 URL. 아직 생성 전이면 null',
    type: String,
    nullable: true,
    example: 'https://media.example.com/o/media/2026/08/course.png',
  })
  courseImageUrl!: string | null

  @ApiProperty({
    description: '현재 요청자의 모임 내 역할',
    enum: ['HOST', 'MEMBER'],
    example: 'HOST',
  })
  role!: 'HOST' | 'MEMBER'

  @ApiProperty({ description: '현재 요청자가 방장인지 여부', example: true })
  isHost!: boolean

  @ApiProperty({
    description: '역할별 화면 액션 권한',
    type: MeetingPermissionsResponseDto,
  })
  permissions!: MeetingPermissionsResponseDto

  @ApiProperty({ description: '모임 유형', type: MeetingTypeSummaryDto })
  meetingType!: MeetingTypeSummaryDto

  @ApiProperty({
    description: '생성 시 입력한 모임 유형 코드',
    enum: MeetingTypeCode,
    enumName: 'MeetingTypeCode',
    example: MeetingTypeCode.Social,
  })
  meetingTypeCode!: MeetingTypeCode

  @ApiProperty({
    description: '생성 시 입력한 방장 프로필',
    type: ParticipantProfileDto,
  })
  host!: ParticipantProfileDto

  @ApiProperty({
    description: '생성 시 선택한 코스 카테고리 슬러그와 순서',
    enum: CategorySlug,
    enumName: 'CategorySlug',
    isArray: true,
  })
  categorySlugs!: CategorySlug[]

  @ApiProperty({
    description: '첫 만남 기준 위치',
    type: MeetingLocationResponseDto,
  })
  firstLocation!: MeetingLocationResponseDto

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

  @ApiProperty({
    description: '선정된 코스. 아직 선정 전이면 null',
    type: () => SelectedCourseResponseDto,
    nullable: true,
    example: null,
  })
  selectedCourse!: SelectedCourseResponseDto | null
}
