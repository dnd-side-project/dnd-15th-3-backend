import {
  BadRequestException,
  Controller,
  Get,
  NotImplementedException,
  Query,
} from '@nestjs/common'
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { firstMeetingSearchRequestSchema } from 'src/catalog/schema/first-meeting-search-request.schema'
import { KakaoLocalService } from 'src/kakao/kakao-local.service'
import { kakaoLocalAddressSearchRequestSchema } from 'src/kakao/schema/local-address-search-request.schema'
import { CategoryResponseDto } from './dto/category-response.dto'
import { FirstMeetingPlaceResponseDto } from './dto/first-meeting-place-response.dto'
import { MeetingTypeResponseDto } from './dto/meeting-type-response.dto'
import { PlaceSearchResponseDto } from './dto/place-search-response.dto'
import { ProfileAvatarResponseDto } from './dto/profile-avatar-response.dto'

@ApiTags('카탈로그')
@Controller()
export class CatalogController {
  constructor(private readonly kakaoLocal: KakaoLocalService) {}

  @Get('meeting-types')
  @ApiOperation({
    summary: '모임 유형 목록 조회',
    description: '모임 생성 화면의 유형 선택 목록을 표시합니다.',
  })
  @ApiOkResponse({
    description: '모임 유형 목록 조회 성공',
    type: MeetingTypeResponseDto,
    isArray: true,
  })
  @ApiResponse({
    status: 501,
    description: '실제 데이터 연동 전까지 제공되지 않는 API입니다.',
  })
  getMeetingTypes(): never {
    throw new NotImplementedException(
      '모임 유형 API는 실제 데이터 연동 후 제공됩니다.',
    )
  }

  @Get('categories')
  @ApiOperation({
    summary: '장소 카테고리 목록 조회',
    description: '모임 생성 시 선택할 장소 카테고리 목록을 표시합니다.',
  })
  @ApiOkResponse({
    description: '카테고리 목록 조회 성공',
    type: CategoryResponseDto,
    isArray: true,
  })
  @ApiResponse({
    status: 501,
    description: '실제 데이터 연동 전까지 제공되지 않는 API입니다.',
  })
  getCategories(): never {
    throw new NotImplementedException(
      '카테고리 API는 실제 데이터 연동 후 제공됩니다.',
    )
  }

  @Get('profile-avatars')
  @ApiOperation({
    summary: '프로필 캐릭터 목록 조회',
    description:
      '호스트·게스트의 프로필 선택 화면에 표시할 캐릭터 목록을 조회합니다.',
  })
  @ApiOkResponse({
    description: '프로필 캐릭터 목록 조회 성공',
    type: ProfileAvatarResponseDto,
    isArray: true,
  })
  @ApiResponse({
    status: 501,
    description: '실제 데이터 연동 전까지 제공되지 않는 API입니다.',
  })
  getProfileAvatars(): never {
    throw new NotImplementedException(
      '프로필 캐릭터 API는 실제 데이터 연동 후 제공됩니다.',
    )
  }

  @Get('places/search')
  @ApiOperation({
    summary: '추천 장소 검색',
    description:
      '추천 장소를 검색합니다. 구현 시 카카오 로컬 API 결과를 내부 Place 형식으로 정규화해 반환합니다.',
  })
  @ApiQuery({ name: 'keyword', description: '검색어', example: '성수역' })
  @ApiOkResponse({
    description: '추천 장소 검색 성공',
    type: PlaceSearchResponseDto,
    isArray: true,
  })
  @ApiBadRequestResponse({ description: '검색어가 비어 있습니다.' })
  @ApiNotFoundResponse({ description: '추천 장소 검색 결과가 없습니다.' })
  @ApiResponse({
    status: 501,
    description: '실제 데이터 연동 전까지 제공되지 않는 API입니다.',
  })
  searchPlaces(@Query('keyword') _keyword: string): never {
    throw new NotImplementedException(
      '추천 장소 검색 API는 실제 데이터 연동 후 제공됩니다.',
    )
  }

  @Get('places/firstmeeting_search')
  @ApiOperation({
    summary: '첫 만남 장소 검색',
    description:
      '입력값이 변경될 때마다 카카오 Local 주소 검색 API를 호출합니다. 한글 자모 한 글자도 검색어로 허용합니다.',
  })
  @ApiQuery({
    name: 'q',
    description: '현재까지 입력된 주소 검색어',
    example: '강남',
    required: true,
  })
  @ApiOkResponse({
    description: '내부 장소 형태로 변환된 첫 만남 장소 목록',
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
}
