import { CategorySlug } from 'src/category/enums/category-slug.enum'

export type KakaoPlaceSearchSpec =
  | { type: 'category'; categoryGroupCode: string }
  | { type: 'keyword'; query: string }

// Kakao Local API가 제공하는 주요 카테고리 그룹 전체 목록이다.
// `other`는 이 목록에서 서비스의 명시적인 카테고리에 배정된 그룹을
// 제외한 보완집합으로 만든다.
export const KAKAO_CATEGORY_GROUP_CODES = [
  'MT1',
  'CS2',
  'PS3',
  'SC4',
  'AC5',
  'PK6',
  'OL7',
  'SW8',
  'BK9',
  'CT1',
  'AG2',
  'PO3',
  'AT4',
  'AD5',
  'FD6',
  'CE7',
  'HP8',
  'PM9',
] as const

const EXPLICIT_CATEGORY_GROUP_CODES = new Set([
  'MT1',
  'CS2',
  'FD6',
  'CE7',
  'AT4',
  'CT1',
])

export const KAKAO_OTHER_CATEGORY_GROUP_CODES =
  KAKAO_CATEGORY_GROUP_CODES.filter(
    (code) => !EXPLICIT_CATEGORY_GROUP_CODES.has(code),
  )

export const KAKAO_PLACE_SEARCH_SPECS_BY_CATEGORY = {
  [CategorySlug.Restaurant]: [{ type: 'category', categoryGroupCode: 'FD6' }],
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
} as const satisfies Record<CategorySlug, readonly KakaoPlaceSearchSpec[]>
