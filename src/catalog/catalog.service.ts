import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Category } from 'src/category/entities/category.entity'
import { MeetingType } from 'src/meeting/entities/meeting-type.entity'
import { PROFILE_AVATAR_DEFINITIONS } from 'src/user/profile-avatar.constants'
import { Repository } from 'typeorm'
import { CategoryResponseDto } from './dto/category-response.dto'
import { MeetingTypeResponseDto } from './dto/meeting-type-response.dto'
import { ProfileAvatarResponseDto } from './dto/profile-avatar-response.dto'

@Injectable()
export class CatalogService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(MeetingType)
    private readonly meetingTypeRepository: Repository<MeetingType>,
  ) {}

  async getMeetingTypes(): Promise<MeetingTypeResponseDto[]> {
    const types = await this.meetingTypeRepository.find({
      order: { displayOrder: 'ASC' },
    })
    return types.map((type) => ({
      id: type.id,
      code: type.code as MeetingTypeResponseDto['code'],
      name: type.name,
    }))
  }

  async getCategories(): Promise<CategoryResponseDto[]> {
    const categories = await this.categoryRepository.find({
      order: { displayOrder: 'ASC' },
    })
    return categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug as CategoryResponseDto['slug'],
    }))
  }

  getProfileAvatars(): ProfileAvatarResponseDto[] {
    return PROFILE_AVATAR_DEFINITIONS.map((avatar) => ({
      id: avatar.id,
      name: avatar.name,
    }))
  }
}
