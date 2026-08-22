import { haversineDistanceMeters } from 'src/common/geo/haversine-distance'

export { haversineDistanceMeters } from 'src/common/geo/haversine-distance'

export const PLACE_SYNC_RADIUS_METERS = 2000
export const PLACE_SYNC_TILE_SIZE_METERS = 1000
export const PLACE_SYNC_TILE_QUERY_RADIUS_METERS = 750
export const PLACE_SYNC_MAX_ATTEMPTS = 3
export const PLACE_SYNC_RETRY_DELAYS_SECONDS = [60, 300] as const
export const PLACE_SYNC_COVERAGE_TTL_MS = 30 * 24 * 60 * 60 * 1000
export const PLACE_SYNC_STALE_AFTER_MS = 15 * 60 * 1000
export const PLACE_SYNC_TILE_LEASE_TTL_MS = 5 * 60 * 1000

export type CoveragePolygon = {
  type: 'Polygon'
  coordinates: number[][][]
}

export type CoverageTile = {
  key: string
  latitude: number
  longitude: number
  coverage: CoveragePolygon
}

const WEB_MERCATOR_EARTH_RADIUS_METERS = 6_378_137
const WEB_MERCATOR_MAX_LATITUDE = 85.05112878
const TILE_DIAGONAL_HALF_METERS =
  (Math.sqrt(2) * PLACE_SYNC_TILE_SIZE_METERS) / 2

function longitudeToMeters(longitude: number): number {
  return (WEB_MERCATOR_EARTH_RADIUS_METERS * longitude * Math.PI) / 180
}

function latitudeToMeters(latitude: number): number {
  const clampedLatitude = Math.max(
    -WEB_MERCATOR_MAX_LATITUDE,
    Math.min(WEB_MERCATOR_MAX_LATITUDE, latitude),
  )
  const latitudeRadians = (clampedLatitude * Math.PI) / 180
  return (
    WEB_MERCATOR_EARTH_RADIUS_METERS *
    Math.log(Math.tan(Math.PI / 4 + latitudeRadians / 2))
  )
}

function metersToLongitude(x: number): number {
  return (x / WEB_MERCATOR_EARTH_RADIUS_METERS) * (180 / Math.PI)
}

function metersToLatitude(y: number): number {
  return (
    (Math.atan(Math.sinh(y / WEB_MERCATOR_EARTH_RADIUS_METERS)) * 180) / Math.PI
  )
}

export function buildCoverageTiles(
  latitude: number,
  longitude: number,
  radiusMeters = PLACE_SYNC_RADIUS_METERS,
): CoverageTile[] {
  const centerX = longitudeToMeters(longitude)
  const centerY = latitudeToMeters(latitude)
  const groundCoverageDistance = radiusMeters + TILE_DIAGONAL_HALF_METERS
  const mercatorCoverageDistance =
    groundCoverageDistance / Math.cos((latitude * Math.PI) / 180)
  const minLongitudeIndex = Math.floor(
    (centerX - mercatorCoverageDistance) / PLACE_SYNC_TILE_SIZE_METERS,
  )
  const maxLongitudeIndex = Math.floor(
    (centerX + mercatorCoverageDistance) / PLACE_SYNC_TILE_SIZE_METERS,
  )
  const minLatitudeIndex = Math.floor(
    (centerY - mercatorCoverageDistance) / PLACE_SYNC_TILE_SIZE_METERS,
  )
  const maxLatitudeIndex = Math.floor(
    (centerY + mercatorCoverageDistance) / PLACE_SYNC_TILE_SIZE_METERS,
  )
  const tiles: CoverageTile[] = []

  for (let yIndex = minLatitudeIndex; yIndex <= maxLatitudeIndex; yIndex += 1) {
    for (
      let xIndex = minLongitudeIndex;
      xIndex <= maxLongitudeIndex;
      xIndex += 1
    ) {
      const minimumX = xIndex * PLACE_SYNC_TILE_SIZE_METERS
      const maximumX = (xIndex + 1) * PLACE_SYNC_TILE_SIZE_METERS
      const minimumY = yIndex * PLACE_SYNC_TILE_SIZE_METERS
      const maximumY = (yIndex + 1) * PLACE_SYNC_TILE_SIZE_METERS
      const tileLongitude = metersToLongitude((minimumX + maximumX) / 2)
      const tileLatitude = metersToLatitude((minimumY + maximumY) / 2)
      const distance = haversineDistanceMeters(
        latitude,
        longitude,
        tileLatitude,
        tileLongitude,
      )

      if (distance > groundCoverageDistance) continue

      const coordinates = [
        [metersToLongitude(minimumX), metersToLatitude(minimumY)],
        [metersToLongitude(maximumX), metersToLatitude(minimumY)],
        [metersToLongitude(maximumX), metersToLatitude(maximumY)],
        [metersToLongitude(minimumX), metersToLatitude(maximumY)],
        [metersToLongitude(minimumX), metersToLatitude(minimumY)],
      ]

      tiles.push({
        key: `${yIndex}:${xIndex}`,
        latitude: tileLatitude,
        longitude: tileLongitude,
        coverage: { type: 'Polygon', coordinates: [coordinates] },
      })
    }
  }

  return tiles
}
