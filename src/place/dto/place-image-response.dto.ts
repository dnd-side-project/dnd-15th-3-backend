import { ApiProperty } from '@nestjs/swagger'

export class PlaceImageResponseDto {
  @ApiProperty({
    description:
      '프론트에서 직접 렌더링할 이미지 URL. 백엔드는 이미지를 프록시하거나 저장하지 않습니다.',
    example: 'https://images.example.com/place.jpg',
  })
  url!: string

  @ApiProperty({
    description: '원본 이미지 로딩 실패 시 사용할 미리보기 이미지 URL',
    example: 'https://search.example.com/place-thumbnail.jpg',
  })
  thumbnailUrl!: string

  @ApiProperty({
    description: '이미지를 제공한 원문 사이트 이름',
    example: '장소 공식 블로그',
    type: String,
    nullable: true,
  })
  sourceName!: string | null

  @ApiProperty({
    description: '이미지 출처를 확인할 수 있는 원문 URL',
    example: 'https://blog.example.com/place-review',
    type: String,
    nullable: true,
  })
  sourceUrl!: string | null

  @ApiProperty({
    description:
      '원본 이미지 너비. 자체 보유 이미지처럼 알 수 없으면 null입니다.',
    example: 1280,
    type: Number,
    nullable: true,
  })
  width!: number | null

  @ApiProperty({
    description:
      '원본 이미지 높이. 자체 보유 이미지처럼 알 수 없으면 null입니다.',
    example: 960,
    type: Number,
    nullable: true,
  })
  height!: number | null
}
