import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class ConfirmCourseRequestDto {
  @ApiProperty({
    description:
      '코스 카드 뒷면에 사용할 지도 스크린샷의 스토리지 key. ' +
      '업로드에 실패했거나 준비되지 않았다면 생략할 수 있으며, ' +
      '이 경우에도 코스 확정 자체는 정상적으로 처리됩니다.',
    example: 'course-cards/1/5.png',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  courseImageKey?: string
}
