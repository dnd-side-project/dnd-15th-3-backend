import { ApiProperty } from '@nestjs/swagger'
import { PlacePhotoSource } from '../enums/place-photo-source.enum'

export class PlacePhotoAttributionDto {
  @ApiProperty({ description: '사진 제공자 표시 이름' })
  displayName!: string

  @ApiProperty({
    description: '사진 제공자 프로필 또는 출처 URL',
    nullable: true,
  })
  uri!: string | null

  @ApiProperty({
    description: '사진 제공자 프로필 이미지 URL',
    nullable: true,
  })
  photoUri!: string | null
}

export class PlacePhotoDto {
  @ApiProperty({ description: '응답 내 사진 식별자' })
  id!: string

  @ApiProperty({ description: '현재 응답에서 렌더링할 사진 URL' })
  url!: string

  @ApiProperty({ description: '원본 사진 너비', nullable: true })
  width!: number | null

  @ApiProperty({ description: '원본 사진 높이', nullable: true })
  height!: number | null

  @ApiProperty({ enum: PlacePhotoSource })
  source!: PlacePhotoSource

  @ApiProperty({ type: PlacePhotoAttributionDto, isArray: true })
  attributions!: PlacePhotoAttributionDto[]
}
