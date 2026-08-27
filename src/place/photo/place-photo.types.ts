import type { PlacePhotoSource } from '../enums/place-photo-source.enum'
import type { PlaceSource } from '../enums/place-source.enum'

export type PlacePhotoAttribution = {
  displayName: string
  uri: string | null
  photoUri: string | null
}

export type PlacePhoto = {
  id: string
  url: string
  width: number | null
  height: number | null
  source: PlacePhotoSource
  attributions: PlacePhotoAttribution[]
  googleMapsUri: string | null
  flagContentUri: string | null
}

export type PlacePhotoTarget = {
  id: string
  source: PlaceSource
  providerPlaceId: string | null
  name: string
  address: string
  roadAddress: string | null
  latitude: number
  longitude: number
  phone: string | null
}

export type GooglePhotoReference = {
  name: string
  width: number
  height: number
  authorAttributions: PlacePhotoAttribution[]
  googleMapsUri: string | null
  flagContentUri: string | null
}

export type GooglePlacePhotoCandidate = {
  id: string
  name: string
  address: string
  latitude: number
  longitude: number
  phone: string | null
  photos: GooglePhotoReference[]
}
