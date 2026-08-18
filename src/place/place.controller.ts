import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common'
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger'
import { FirstMeetingPlaceResponseDto } from 'src/catalog/dto/first-meeting-place-response.dto'
import { firstMeetingSearchRequestSchema } from 'src/catalog/schema/first-meeting-search-request.schema'
import { ApiErrorResponse } from 'src/common/decorators/api-error-response.decorator'
import { CommonErrorCode } from 'src/common/exception/common-error-code'
import { BigIntStringPipe } from 'src/common/pipes/bigint-string.pipe'
import { KakaoLocalService } from 'src/kakao/kakao-local.service'
import { kakaoLocalAddressSearchRequestSchema } from 'src/kakao/schema/local-address-search-request.schema'
import { PlaceSearchResponseDto } from './dto/place-search-response.dto'
import { PlaceSearchResultDto } from './dto/place-search-result.dto'
import { PlaceErrorCode } from './exception/place-error-code'
import { PlaceService } from './place.service'
import { placeSearchRequestSchema } from './schema/place-search-request.schema'

@ApiTags('장소')
@Controller('places')
export class PlaceController {
  constructor(
    private readonly placeService: PlaceService,
    private readonly kakaoLocal: KakaoLocalService,
  ) {}

  @Get('first-meeting')
  @ApiOperation({
    summary: '첫 만남 위치 검색',
    description:
      '입력값이 변경될 때마다 카카오 Local 주소 검색 API를 호출합니다. 이 API는 주변 장소 DB를 조회하지 않습니다.',
  })
  @ApiQuery({
    name: 'q',
    description: '주소 검색어',
    example: '강남',
    required: true,
  })
  @ApiOkResponse({
    description: '첫 만남 위치 검색 성공',
    type: FirstMeetingPlaceResponseDto,
    isArray: true,
  })
  @ApiBadRequestResponse({ description: '검색어가 비어 있습니다.' })
  @ApiResponse({
    status: 503,
    description: 'KAKAO_REST_API_KEY가 설정되지 않았습니다.',
  })
  @ApiResponse({
    status: 502,
    description: '카카오 주소 검색 API 호출 또는 응답 검증에 실패했습니다.',
  })
  async searchFirstMeetingPlaces(@Query('q') q?: string) {
    const parsedQuery = firstMeetingSearchRequestSchema.safeParse({ q })
    if (!parsedQuery.success) {
      throw new BadRequestException(
        parsedQuery.error.issues[0]?.message ?? '검색어를 입력해주세요.',
      )
    }

    const kakaoRequest = kakaoLocalAddressSearchRequestSchema.parse({
      query: parsedQuery.data.q,
    })

    return await this.kakaoLocal.searchAddressPlaces(kakaoRequest)
  }

  @Get('search')
  @ApiOperation({
    summary: '주변 장소 검색',
    description:
      '로컬 DB에 수집된 장소 중 모임 기준 위치 반경 2km 이내의 장소를 조회합니다. 외부 API를 호출하지 않습니다.',
  })
  @ApiQuery({
    name: 'meetingId',
    description: '기준 위치를 가진 모임 ID',
    example: '123',
  })
  @ApiQuery({
    name: 'accessToken',
    description: '모임 참여자 전용 재접속 토큰',
    example: 'member-session-token',
    required: true,
  })
  @ApiQuery({
    name: 'categoryId',
    description: '카테고리 ID 필터',
    example: '1',
    required: false,
  })
  @ApiQuery({
    name: 'page',
    description: '페이지 번호',
    example: 1,
    required: false,
  })
  @ApiQuery({
    name: 'size',
    description: '페이지 크기(최대 50)',
    example: 20,
    required: false,
  })
  @ApiOkResponse({
    description: '반경 내 장소 검색 성공',
    type: PlaceSearchResponseDto,
  })
  @ApiBadRequestResponse({ description: '검색 요청 형식이 올바르지 않습니다.' })
  @ApiNotFoundResponse({ description: '모임 기준 위치를 찾을 수 없습니다.' })
  @ApiUnauthorizedResponse({ description: '참여자 토큰이 유효하지 않습니다.' })
  search(@Query() query: Record<string, unknown>) {
    const parsedQuery = placeSearchRequestSchema.safeParse(query)
    if (!parsedQuery.success) {
      throw new BadRequestException(
        parsedQuery.error.issues[0]?.message ??
          '장소 검색 요청 형식이 올바르지 않습니다.',
      )
    }

    return this.placeService.searchPlaces(parsedQuery.data)
  }

  @Get(':placeId')
  @ApiOperation({
    summary: '장소 상세 조회',
    description:
      '검색 리스트에서 장소를 클릭했을 때 상세 정보를 조회합니다. 모임 상태와 무관하게 조회 가능합니다.',
  })
  @ApiParam({
    name: 'placeId',
    description: '조회할 장소의 ID',
    schema: { type: 'string', example: '1', pattern: '^\\d+$' },
  })
  @ApiQuery({
    name: 'accessToken',
    description: '모임 참여자 전용 재접속 토큰',
    example: 'member-session-token',
    required: true,
  })
  @ApiOkResponse({ type: PlaceSearchResultDto })
  @ApiErrorResponse(
    CommonErrorCode.validationError,
    'placeId 형식이 올바르지 않음',
  )
  @ApiErrorResponse(
    CommonErrorCode.authenticationFailed,
    '참여자 토큰이 유효하지 않음',
  )
  @ApiErrorResponse(PlaceErrorCode.notFound, '장소를 찾을 수 없음')
  async getPlaceDetail(
    @Param('placeId', BigIntStringPipe) placeId: string,
    @Query('accessToken') accessToken: string,
  ): Promise<PlaceSearchResultDto> {
    return await this.placeService.getPlaceDetail(placeId, accessToken)
  }
}
