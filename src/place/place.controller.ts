import { Controller, Get, NotImplementedException, Param } from '@nestjs/common'
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { BigIntStringPipe } from 'src/common/pipes/bigint-string.pipe'
import { PlaceSearchResultDto } from './dto/place-search-result.dto'

@ApiTags('장소')
@Controller('places')
export class PlaceController {
  @Get(':placeId')
  @ApiOperation({
    summary: '장소 상세 조회',
    description: '검색 리스트에서 장소를 클릭했을 때 상세 정보를 조회합니다.',
  })
  @ApiParam({ name: 'placeId', description: '조회할 장소의 ID', example: '1' })
  @ApiOkResponse({ type: PlaceSearchResultDto })
  @ApiBadRequestResponse({ description: 'placeId 형식이 올바르지 않습니다.' })
  @ApiNotFoundResponse({ description: '장소를 찾을 수 없습니다.' })
  @ApiResponse({
    status: 501,
    description: '실제 데이터 연동 전까지 제공되지 않는 API입니다.',
  })
  getPlaceDetail(@Param('placeId', BigIntStringPipe) placeId: string): never {
    throw new NotImplementedException(
      '장소 상세 조회 API는 실제 데이터 연동 후 제공됩니다.',
    )
  }
}
