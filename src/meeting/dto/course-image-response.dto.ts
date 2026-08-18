import { ApiProperty } from '@nestjs/swagger'

export class CourseImageResponseDto {
  @ApiProperty({
    description: '모임에 최초 등록된 코스 이미지의 공개 URL',
    example: 'https://media.example.com/o/media/2026/08/course.png',
  })
  imageUrl!: string

  @ApiProperty({
    description: '코스 이미지가 모임에 등록된 시각',
    example: '2026-08-17T12:34:56.000Z',
    format: 'date-time',
  })
  uploadedAt!: Date
}
