import { CategorySlug } from 'src/category/enums/category-slug.enum'

export const GOOGLE_PLACE_TYPES_BY_CATEGORY: Record<CategorySlug, string[]> = {
  [CategorySlug.Restaurant]: ['restaurant'],
  [CategorySlug.Cafe]: ['cafe'],
  [CategorySlug.Bar]: ['bar'],
  [CategorySlug.Walk]: ['park', 'tourist_attraction'],
  [CategorySlug.Shopping]: ['shopping_mall', 'store'],
  [CategorySlug.Activity]: ['amusement_park', 'bowling_alley', 'gym'],
  [CategorySlug.Culture]: ['museum', 'art_gallery', 'movie_theater'],
  [CategorySlug.Other]: [],
}
