import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'

export class UpdateCourseImageRequestDto {
  @ApiProperty({
    description: '코스 카드 뒷면에 사용할 지도 스크린샷의 스토리지 key',
    example: 'course-cards/1/5.png',
  })
  @IsString()
  @IsNotEmpty()
  courseImageKey!: string
}
