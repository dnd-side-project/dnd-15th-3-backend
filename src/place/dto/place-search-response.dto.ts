import { ApiProperty } from '@nestjs/swagger'
import { PlaceSearchResultDto } from './place-search-result.dto'

export class PlaceSearchResponseDto {
  @ApiProperty({
    description: '검색된 장소 목록',
    type: [PlaceSearchResultDto],
  })
  items: PlaceSearchResultDto[]

  @ApiProperty({
    description: '다음 페이지 조회용 커서. 더 이상 없으면 null',
    example: 'eyJpZCI6MTB9',
    nullable: true,
  })
  nextCursor: string | null
}
