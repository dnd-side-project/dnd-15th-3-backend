import { CategorySlug } from './enums/category-slug.enum'

export const MAX_COURSE_STEPS = 6

export const DEFAULT_COURSE_CATEGORY_SLUGS = [
  CategorySlug.Restaurant,
  CategorySlug.Cafe,
  CategorySlug.Bar,
  CategorySlug.Walk,
  CategorySlug.Shopping,
] as const

export const CATEGORY_DEFINITIONS = [
  {
    id: '2',
    slug: CategorySlug.Restaurant,
    name: '음식점',
    displayOrder: 1,
  },
  { id: '1', slug: CategorySlug.Cafe, name: '카페', displayOrder: 2 },
  { id: '4', slug: CategorySlug.Bar, name: '술 · 바', displayOrder: 3 },
  {
    id: '3',
    slug: CategorySlug.Walk,
    name: '산책 · 야경',
    displayOrder: 4,
  },
  {
    id: '5',
    slug: CategorySlug.Shopping,
    name: '팝업 · 쇼핑',
    displayOrder: 5,
  },
  {
    id: '6',
    slug: CategorySlug.Activity,
    name: '액티비티',
    displayOrder: 6,
  },
  {
    id: '7',
    slug: CategorySlug.Culture,
    name: '문화 · 전시',
    displayOrder: 7,
  },
  { id: '8', slug: CategorySlug.Other, name: '기타', displayOrder: 8 },
] as const
