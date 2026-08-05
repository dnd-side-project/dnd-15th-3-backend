import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Query,
} from '@nestjs/common'
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { MockApiService } from 'src/mock/mock-api.service'

class MeetingTypeResponseDto {
  @ApiProperty({ description: '모임 유형 ID', example: '1' })
  id!: string

  @ApiProperty({
    description: '화면에 표시할 모임 유형명',
    example: '친구 모임',
  })
  name!: string
}

class CategoryResponseDto {
  @ApiProperty({ description: '카테고리 ID', example: '1' })
  id!: string

  @ApiProperty({ description: '카테고리명', example: '카페' })
  name!: string

  @ApiProperty({ description: 'URL·식별자에 사용할 슬러그', example: 'cafe' })
  slug!: string
}

class PlaceSearchResponseDto {
  @ApiProperty({ description: '장소 ID', example: '101' })
  id!: string

  @ApiProperty({ description: '장소명', example: '성수 카페 모모' })
  name!: string

  @ApiProperty({
    description: '도로명 또는 지번 주소',
    example: '서울 성동구 성수이로 1',
  })
  address!: string

  @ApiProperty({ description: '위도', example: 37.5446 })
  latitude!: number

  @ApiProperty({ description: '경도', example: 127.0557 })
  longitude!: number

  @ApiProperty({
    description: '대표 이미지 또는 미리보기 URL',
    example: 'https://...',
  })
  previewUrl!: string
}

class ProfileAvatarResponseDto {
  @ApiProperty({ description: '캐릭터 식별자', example: 'momo-blue' })
  id!: string

  @ApiProperty({ description: '캐릭터 이름', example: '파란 모모' })
  name!: string

  @ApiProperty({
    description: '이미지 객체 키',
    example: 'avatars/momo-blue.png',
  })
  imageKey!: string

  @ApiProperty({
    description: '프론트엔드가 바로 표시할 캐릭터 이미지 URL',
    example: 'https://images.momo.local/avatars/momo-blue.png',
  })
  imageUrl!: string
}

@ApiTags('카탈로그')
@ApiResponse({
  status: 501,
  description: 'MOCK_API_ENABLED=false에서는 아직 구현되지 않은 API입니다.',
})
@Controller()
export class CatalogController {
  constructor(private readonly mockApi: MockApiService) {}

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
  getMeetingTypes() {
    this.mockApi.requireEnabled()
    return this.mockApi.getMeetingTypes()
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
  getCategories() {
    this.mockApi.requireEnabled()
    return this.mockApi.getCategories()
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
  getProfileAvatars() {
    this.mockApi.requireEnabled()
    return this.mockApi.getAvatars()
  }

  @Get('places/search')
  @ApiOperation({
    summary: '장소 검색',
    description:
      '출발 장소와 추천 장소를 검색합니다. 구현 시 카카오 로컬 API 결과를 내부 Place 형식으로 정규화해 반환합니다.',
  })
  @ApiQuery({ name: 'keyword', description: '검색어', example: '성수역' })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    description: '카테고리 ID 필터',
    example: '1',
  })
  @ApiOkResponse({
    description: '장소 검색 성공',
    type: PlaceSearchResponseDto,
    isArray: true,
  })
  @ApiBadRequestResponse({ description: '검색어가 비어 있습니다.' })
  @ApiNotFoundResponse({ description: '검색 결과가 없습니다.' })
  searchPlaces(
    @Query('keyword') keyword: string,
    @Query('categoryId') categoryId?: string,
  ) {
    this.mockApi.requireEnabled()
    if (!keyword?.trim()) {
      throw new BadRequestException('검색어를 입력해주세요.')
    }

    const places = this.mockApi.searchPlaces(keyword, categoryId)
    if (places.length === 0) {
      throw new NotFoundException('검색 결과가 없습니다.')
    }

    return places
  }
}
