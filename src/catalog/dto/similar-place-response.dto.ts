import { ApiProperty } from '@nestjs/swagger'
import { PlacePhotoDto } from 'src/place/dto/place-photo.dto'

export class SimilarPlaceResponseDto {
  @ApiProperty({ description: '장소 ID', example: '101' })
  id!: string

  @ApiProperty({ description: '장소가 속한 카테고리 ID', example: '1' })
  categoryId!: string

  @ApiProperty({ description: '장소명', example: '성수 카페 모모' })
  name!: string

  @ApiProperty({
    description: '도로명 또는 지번 주소',
    example: '서울 성동구 성수이로 1',
  })
  address!: string

  @ApiProperty({ description: '위도', example: 37.5446 })
  latitude!: number

  @ApiProperty({ description: '경도', example: 127.0557 })
  longitude!: number

  @ApiProperty({
    description:
      '기존 클라이언트 호환용 대표 이미지 URL. 신규 클라이언트는 previewPhoto를 사용합니다.',
    type: 'string',
    format: 'uri',
    example: 'https://...',
    nullable: true,
    deprecated: true,
  })
  primaryImageUrl!: string | null

  @ApiProperty({
    description:
      '기존 클라이언트 호환용 미리보기 URL. 신규 클라이언트는 previewPhoto를 사용합니다.',
    type: 'string',
    format: 'uri',
    example: 'https://...',
    nullable: true,
    deprecated: true,
  })
  previewUrl!: string | null

  @ApiProperty({
    description: '대표 사진과 표시 의무 정보를 함께 담은 객체',
    type: PlacePhotoDto,
    nullable: true,
  })
  previewPhoto!: PlacePhotoDto | null

  @ApiProperty({
    description: 'Kakao 장소 상세 URL',
    type: 'string',
    nullable: true,
    required: false,
  })
  placeUrl?: string | null
}
