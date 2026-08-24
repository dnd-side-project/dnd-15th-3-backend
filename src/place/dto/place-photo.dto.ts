import { ApiProperty } from '@nestjs/swagger'
import { PlacePhotoSource } from '../enums/place-photo-source.enum'

export class PlacePhotoAttributionDto {
  @ApiProperty({ description: '사진 제공자 표시 이름' })
  displayName!: string

  @ApiProperty({
    description: '사진 제공자 프로필 또는 출처 URL',
    type: String,
    format: 'uri',
    nullable: true,
  })
  uri!: string | null

  @ApiProperty({
    description: '사진 제공자 프로필 이미지 URL',
    type: String,
    format: 'uri',
    nullable: true,
  })
  photoUri!: string | null
}

export class PlacePhotoDto {
  @ApiProperty({ description: '응답 내 사진 식별자' })
  id!: string

  @ApiProperty({
    description:
      '현재 응답에서만 렌더링할 사진 URL. 클라이언트가 영구 저장하지 않습니다.',
    type: String,
    format: 'uri',
  })
  url!: string

  @ApiProperty({ description: '원본 사진 너비', type: Number, nullable: true })
  width!: number | null

  @ApiProperty({ description: '원본 사진 높이', type: Number, nullable: true })
  height!: number | null

  @ApiProperty({
    description:
      '사진 출처. GOOGLE이면 Google Maps 및 사진 제공자 표시 규칙을 적용합니다.',
    enum: PlacePhotoSource,
  })
  source!: PlacePhotoSource

  @ApiProperty({
    description:
      '사진 제공자 표시 정보. 값이 있으면 사진과 연결된 위치에 표시합니다.',
    type: PlacePhotoAttributionDto,
    isArray: true,
  })
  attributions!: PlacePhotoAttributionDto[]

  @ApiProperty({
    description:
      'Google Maps에서 개별 원본 사진을 볼 수 있는 URL. GOOGLE 사진은 HTTPS URL이고 OWNED 사진은 null입니다.',
    type: String,
    format: 'uri',
    nullable: true,
  })
  googleMapsUri!: string | null

  @ApiProperty({
    description:
      'Google Maps에 사진 문제를 신고할 수 있는 URL. 제공되지 않거나 OWNED 사진이면 null입니다.',
    type: String,
    format: 'uri',
    nullable: true,
  })
  flagContentUri!: string | null
}
