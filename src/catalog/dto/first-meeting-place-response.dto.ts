import { ApiProperty } from '@nestjs/swagger'

export class FirstMeetingPlaceResponseDto {
  @ApiProperty({
    description: '주소 Provider 결과 ID',
    example: 'kakao-address-...',
  })
  id!: string

  @ApiProperty({
    description: '주소 Provider의 외부 주소 ID',
    example: 'kakao-address-...',
  })
  externalAddressId!: string

  @ApiProperty({ description: '장소명', example: '강남역 11번 출구' })
  name!: string

  @ApiProperty({ description: '주소', example: '서울 강남구 강남대로 396' })
  address!: string

  @ApiProperty({ description: '위도', example: 37.4979 })
  latitude!: number

  @ApiProperty({ description: '경도', example: 127.0276 })
  longitude!: number
}
