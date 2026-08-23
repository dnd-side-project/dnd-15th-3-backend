import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class MeetingLocationDto {
  @ApiProperty({ description: '화면에 표시할 위치명', example: '강남역' })
  displayName!: string

  @ApiProperty({ description: '주소', example: '서울특별시 강남구 ...' })
  address!: string

  @ApiProperty({ description: '위도', example: 37.4979 })
  latitude!: number

  @ApiProperty({ description: '경도', example: 127.0276 })
  longitude!: number

  @ApiPropertyOptional({
    description: '첫 만남 위치 검색 결과의 externalAddressId',
    example: 'kakao-place-22906009',
    nullable: true,
  })
  externalAddressId?: string | null
}

export class MeetingLocationResponseDto extends MeetingLocationDto {
  @ApiProperty({ description: '첫 만남 기준 위치 ID', example: '12' })
  id!: string

  @ApiProperty({ description: '수집 버전', example: 1 })
  syncVersion!: number
}
