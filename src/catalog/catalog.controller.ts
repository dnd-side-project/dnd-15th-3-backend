import { Controller, Get } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { CatalogService } from './catalog.service'
import { CategoryResponseDto } from './dto/category-response.dto'
import { MeetingTypeResponseDto } from './dto/meeting-type-response.dto'
import { ProfileAvatarResponseDto } from './dto/profile-avatar-response.dto'

@ApiTags('카탈로그')
@Controller()
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

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
    return this.catalogService.getMeetingTypes()
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
    return this.catalogService.getCategories()
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
    return this.catalogService.getProfileAvatars()
  }
}
