import { ApiProperty } from '@nestjs/swagger'

export class FirstMeetingPlaceResponseDto {
  @ApiProperty({
    description: 'Kakao 장소 검색 결과 ID',
    example: 'kakao-place-22906009',
  })
  id!: string

  @ApiProperty({
    description: '첫 만남 위치 저장 시 사용할 외부 장소 ID',
    example: 'kakao-place-22906009',
  })
  externalAddressId!: string

  @ApiProperty({ description: '장소명', example: '강남역 2호선 2번출구' })
  name!: string

  @ApiProperty({ description: '주소', example: '서울 강남구 역삼동 825-13' })
  address!: string

  @ApiProperty({ description: '위도', example: 37.4979 })
  latitude!: number

  @ApiProperty({ description: '경도', example: 127.0276 })
  longitude!: number
}
