import { z } from 'zod'

const placeSearchCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
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
})

export const placeSearchResponseSchema = z.object({
  items: z.array(placeSearchItemSchema),
  page: z.number().int().min(1),
  size: z.number().int().min(1).max(50),
  total: z.number().int().nonnegative(),
  hasNext: z.boolean(),
  collectionStatus: collectionStatusSchema,
  lastSyncedAt: z.date().nullable(),
})

export type PlaceSearchItem = z.infer<typeof placeSearchItemSchema>
export type PlaceSearchResponse = z.infer<typeof placeSearchResponseSchema>
