import { CategorySlug } from 'src/category/enums/category-slug.enum'
import { z } from 'zod'
import { PlaceSource } from '../enums/place-source.enum'

const placeSearchCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
})

export const placeImageResponseSchema = z.object({
  url: z.string().url(),
  thumbnailUrl: z.string().url(),
  sourceName: z.string().nullable(),
  sourceUrl: z.string().url().nullable(),
  width: z.number().int().nonnegative().nullable(),
  height: z.number().int().nonnegative().nullable(),
})

const collectionStatusSchema = z.enum([
  'PENDING',
  'RUNNING',
  'READY',
  'PARTIAL',
  'FAILED',
])

export const placeSearchItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  category: placeSearchCategorySchema,
  latitude: z.number(),
  longitude: z.number(),
  distanceMeters: z.number().nonnegative(),
  previewUrl: z.string().nullable(),
  previewImage: placeImageResponseSchema.nullable(),
  source: z.enum(PlaceSource),
  providerPlaceId: z.string().nullable(),
  roadAddress: z.string().nullable(),
  phone: z.string().nullable(),
  placeUrl: z.string().nullable(),
})

export const placeSearchResponseSchema = z.object({
  items: z.array(placeSearchItemSchema),
  page: z.number().int().min(1),
  size: z.number().int().min(1).max(50),
  total: z.number().int().nonnegative(),
  hasNext: z.boolean(),
  collectionStatus: collectionStatusSchema,
  lastSyncedAt: z.date().nullable(),
  source: z.literal(PlaceSource.Kakao),
  isLive: z.literal(true),
  unsupportedCategorySlugs: z.array(z.enum(CategorySlug)),
})

export type PlaceSearchItem = z.infer<typeof placeSearchItemSchema>
export type PlaceSearchResponse = z.infer<typeof placeSearchResponseSchema>
