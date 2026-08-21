import { CategorySlug } from 'src/category/enums/category-slug.enum'

export type KakaoPlaceSearchSpec =
  | { type: 'category'; categoryGroupCode: string }
  | { type: 'keyword'; query: string }

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
  [CategorySlug.Other]: [],
} as const satisfies Record<CategorySlug, readonly KakaoPlaceSearchSpec[]>
