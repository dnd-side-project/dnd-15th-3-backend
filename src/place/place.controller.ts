import { Controller, Get, Param, Query } from '@nestjs/common'
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger'
import { FirstMeetingPlaceResponseDto } from 'src/catalog/dto/first-meeting-place-response.dto'
import { firstMeetingSearchRequestSchema } from 'src/catalog/schema/first-meeting-search-request.schema'
import { ApiErrorResponse } from 'src/common/decorators/api-error-response.decorator'
import { CommonErrorCode } from 'src/common/exception/common-error-code'
import { createValidationException } from 'src/common/exception/validation-exception.factory'
import { BigIntStringPipe } from 'src/common/pipes/bigint-string.pipe'
import { KakaoLocalService } from 'src/kakao/kakao-local.service'
import { kakaoLocalKeywordSearchRequestSchema } from 'src/kakao/schema/local-keyword-search-request.schema'
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
      '카카오 Local 키워드 검색 API로 역 출구·건물·상호 등 첫 만남 위치 후보를 조회합니다. 선택한 결과의 name, address, latitude, longitude, externalAddressId를 모임 생성·위치 변경 요청에 사용합니다. 이 API는 주변 장소 DB를 조회하거나 추천 장소를 추가하지 않습니다.',
  })
  @ApiQuery({
    name: 'q',
    description: '장소 검색어',
    example: '강남역 2번출구',
    required: true,
  })
  @ApiOkResponse({
    description: '첫 만남 위치 검색 성공',
    type: FirstMeetingPlaceResponseDto,
    isArray: true,
  })
  @ApiErrorResponse(CommonErrorCode.validationError, '검색어가 비어 있음')
  @ApiErrorResponse(
    CommonErrorCode.serviceUnavailable,
    '장소 검색 서비스를 사용할 수 없음',
  )
  @ApiErrorResponse(
    CommonErrorCode.externalServiceError,
    '카카오 키워드 검색 API 호출 또는 응답 검증 실패',
  )
  async searchFirstMeetingPlaces(@Query('q') q?: string) {
    const parsedQuery = firstMeetingSearchRequestSchema.safeParse({ q })
    if (!parsedQuery.success) {
      throw createValidationException(parsedQuery.error.issues)
    }

    const kakaoRequest = kakaoLocalKeywordSearchRequestSchema.parse({
      query: parsedQuery.data.q,
    })

    return await this.kakaoLocal.searchKeywordPlaces(kakaoRequest)
  }

  @Get('search')
  @ApiOperation({
    summary: '주변 장소 검색',
    description:
      'Kakao Local API에서 모임 기준 위치 반경 2km 이내의 장소를 실시간 조회합니다. 현재 페이지의 previewUrl은 프론트에서 직접 렌더링할 외부 이미지 URL이며, 이미지 파일을 프록시하거나 저장하지 않습니다. 이미지가 없으면 null입니다.',
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
    name: 'categorySlug',
    description: '카테고리 슬러그 필터. categoryId와 함께 사용할 수 없습니다.',
    required: false,
  })
  @ApiQuery({
    name: 'q',
    description:
      'Kakao 키워드 검색에 전달할 장소명·주소 검색어. 기준 위치 반경과 선택 카테고리를 함께 적용합니다.',
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
  @ApiErrorResponse(
    CommonErrorCode.validationError,
    '검색 요청 형식이 올바르지 않음',
  )
  @ApiErrorResponse(
    PlaceErrorCode.meetingLocationNotFound,
    '모임 기준 위치를 찾을 수 없음',
  )
  @ApiErrorResponse(
    CommonErrorCode.authenticationFailed,
    '참여자 토큰이 유효하지 않음',
  )
  search(@Query() query: Record<string, unknown>) {
    const parsedQuery = placeSearchRequestSchema.safeParse(query)
    if (!parsedQuery.success) {
      throw createValidationException(parsedQuery.error.issues)
    }

    return this.placeService.searchPlaces(parsedQuery.data)
  }

  @Get(':placeId')
  @ApiOperation({
    summary: '장소 상세 조회',
    description:
      '검색 리스트에서 장소를 클릭했을 때 상세 정보를 조회합니다. accessToken이 속한 모임의 기준 위치를 사용하며 모임 상태와 무관하게 조회 가능합니다. imageUrls는 프론트에서 직접 렌더링할 URL 목록이며 이미지가 없으면 빈 배열입니다.',
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
  @ApiErrorResponse(
    [PlaceErrorCode.notFound, PlaceErrorCode.meetingLocationNotFound],
    '장소 또는 모임 기준 위치를 찾을 수 없음',
  )
  async getPlaceDetail(
    @Param('placeId', BigIntStringPipe) placeId: string,
    @Query('accessToken') accessToken: string,
  ): Promise<PlaceSearchResultDto> {
    return await this.placeService.getPlaceDetail(placeId, accessToken)
  }
}
