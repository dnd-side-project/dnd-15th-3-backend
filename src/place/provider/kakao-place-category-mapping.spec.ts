import { CategorySlug } from 'src/category/enums/category-slug.enum'
import {
  KAKAO_CATEGORY_GROUP_CODES,
  KAKAO_OTHER_CATEGORY_GROUP_CODES,
  KAKAO_PLACE_SEARCH_SPECS_BY_CATEGORY,
} from './kakao-place-category-mapping'

describe('KAKAO_PLACE_SEARCH_SPECS_BY_CATEGORY', () => {
  it('서비스 카테고리를 Kakao 카테고리와 키워드 검색으로 매핑한다', () => {
    expect(KAKAO_PLACE_SEARCH_SPECS_BY_CATEGORY).toEqual({
      [CategorySlug.Restaurant]: [
        { type: 'category', categoryGroupCode: 'FD6' },
      ],
      [CategorySlug.Cafe]: [{ type: 'category', categoryGroupCode: 'CE7' }],
      [CategorySlug.Bar]: [
        { type: 'keyword', query: '술집' },
        { type: 'keyword', query: '와인바' },
        { type: 'keyword', query: '칵테일바' },
        { type: 'keyword', query: '펍' },
        { type: 'keyword', query: '이자카야' },
      ],
      [CategorySlug.Walk]: [
        { type: 'category', categoryGroupCode: 'AT4' },
        { type: 'keyword', query: '공원' },
        { type: 'keyword', query: '산책로' },
        { type: 'keyword', query: '야경명소' },
      ],
      [CategorySlug.Shopping]: [
        { type: 'category', categoryGroupCode: 'MT1' },
        { type: 'category', categoryGroupCode: 'CS2' },
        { type: 'keyword', query: '쇼핑몰' },
        { type: 'keyword', query: '백화점' },
        { type: 'keyword', query: '아울렛' },
        { type: 'keyword', query: '팝업스토어' },
      ],
      [CategorySlug.Activity]: [
        { type: 'keyword', query: '방탈출' },
        { type: 'keyword', query: '볼링장' },
        { type: 'keyword', query: '클라이밍' },
        { type: 'keyword', query: '보드게임카페' },
        { type: 'keyword', query: '놀이공원' },
      ],
      [CategorySlug.Culture]: [
        { type: 'category', categoryGroupCode: 'CT1' },
        { type: 'keyword', query: '전시회' },
      ],
      [CategorySlug.Other]: KAKAO_OTHER_CATEGORY_GROUP_CODES.map(
        (categoryGroupCode) => ({ type: 'category', categoryGroupCode }),
      ),
    })
  })

  it('기타는 명시적으로 분류한 주요 그룹을 제외한 Kakao 그룹의 보완집합이다', () => {
    expect(KAKAO_OTHER_CATEGORY_GROUP_CODES).toEqual([
      'PS3',
      'SC4',
      'AC5',
      'PK6',
      'OL7',
      'SW8',
      'BK9',
      'AG2',
      'PO3',
      'AD5',
      'HP8',
      'PM9',
    ])

    const categoryGroupCodes = Object.values(
      KAKAO_PLACE_SEARCH_SPECS_BY_CATEGORY,
    )
      .flat()
      .filter(
        (
          spec,
        ): spec is Extract<
          (typeof KAKAO_PLACE_SEARCH_SPECS_BY_CATEGORY)[CategorySlug][number],
          { type: 'category' }
        > => spec.type === 'category',
      )
      .map((spec) => spec.categoryGroupCode)

    expect(new Set(categoryGroupCodes)).toEqual(
      new Set(KAKAO_CATEGORY_GROUP_CODES),
    )
    expect(categoryGroupCodes).toHaveLength(new Set(categoryGroupCodes).size)
  })
})
