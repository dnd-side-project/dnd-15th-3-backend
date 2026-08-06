import { ApiProperty } from '@nestjs/swagger'
import { MAX_COURSE_STEPS } from 'src/category/category.constants'
import { CategorySlug } from 'src/category/enums/category-slug.enum'

export class UpdateCoursePlanDto {
  @ApiProperty({
    description:
      '저장할 코스 카테고리 슬러그 목록. 배열 순서가 코스 진행 순서입니다. 비우면 코스를 모두 삭제합니다.',
    enum: CategorySlug,
    enumName: 'CategorySlug',
    isArray: true,
    minItems: 0,
    maxItems: MAX_COURSE_STEPS,
    uniqueItems: true,
    example: [CategorySlug.Restaurant, CategorySlug.Cafe, CategorySlug.Bar],
  })
  categorySlugs!: CategorySlug[]

  @ApiProperty({
    description: '조회한 코스 버전. 다른 변경이 먼저 저장되면 충돌 처리합니다.',
    example: 1,
    minimum: 1,
  })
  version!: number
}
