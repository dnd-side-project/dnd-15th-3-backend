import { ApiProperty } from '@nestjs/swagger'
import { MapPinDto } from './map-pin.dto'

export class MapPinsResponseDto {
  @ApiProperty({ description: '모임 시작지', type: MapPinDto })
  startPlace: MapPinDto

  @ApiProperty({
    description: '참여자가 공유한 장소 목록',
    type: [MapPinDto],
    required: false,
  })
  sharedPlaces?: MapPinDto[]
}
