import { haversineDistanceMeters } from 'src/common/geo/haversine-distance'
import { PlacePhotoMatchStatus } from '../enums/place-photo-match-status.enum'
import type { PlacePhotoTarget } from './place-photo.types'

const MAX_MATCH_DISTANCE_METERS = 75
const CLOSE_MATCH_DISTANCE_METERS = 25
const MIN_CONTAINED_NAME_LENGTH = 4
const MIN_MATCH_CONFIDENCE = 0.8
const MIN_WINNER_MARGIN = 0.1

export type PlacePhotoMatchCandidate = {
  id: string
  name: string
  address: string
  latitude: number
  longitude: number
  phone: string | null
}

export type PlacePhotoMatchSelection = {
  status: PlacePhotoMatchStatus
  candidate: PlacePhotoMatchCandidate | null
  confidence: number | null
}

type ScoredCandidate = {
  candidate: PlacePhotoMatchCandidate
  confidence: number
}

export function selectPlacePhotoMatch(
  target: PlacePhotoTarget,
  candidates: PlacePhotoMatchCandidate[],
): PlacePhotoMatchSelection {
  if (candidates.length === 0) {
    return {
      status: PlacePhotoMatchStatus.NotFound,
      candidate: null,
      confidence: null,
    }
  }

  const scored = candidates
    .map((candidate) => scoreCandidate(target, candidate))
    .filter((candidate): candidate is ScoredCandidate => candidate !== null)
    .sort((left, right) => right.confidence - left.confidence)

  const winner = scored[0]
  if (!winner) {
    return {
      status: PlacePhotoMatchStatus.NotFound,
      candidate: null,
      confidence: null,
    }
  }
  if (winner.confidence < MIN_MATCH_CONFIDENCE) {
    return {
      status: PlacePhotoMatchStatus.Ambiguous,
      candidate: null,
      confidence: winner.confidence,
    }
  }
  const runnerUp = scored[1]
  if (runnerUp && winner.confidence - runnerUp.confidence < MIN_WINNER_MARGIN) {
    return {
      status: PlacePhotoMatchStatus.Ambiguous,
      candidate: null,
      confidence: winner.confidence,
    }
  }

  return {
    status: PlacePhotoMatchStatus.Matched,
    candidate: winner.candidate,
    confidence: winner.confidence,
  }
}

function scoreCandidate(
  target: PlacePhotoTarget,
  candidate: PlacePhotoMatchCandidate,
): ScoredCandidate | null {
  const targetName = normalizeText(target.name)
  const candidateName = normalizeText(candidate.name)
  const exactName = targetName === candidateName
  const containedName =
    Math.min(targetName.length, candidateName.length) >=
      MIN_CONTAINED_NAME_LENGTH &&
    (targetName.includes(candidateName) || candidateName.includes(targetName))
  if (!exactName && !containedName) return null

  const distanceMeters = haversineDistanceMeters(
    target.latitude,
    target.longitude,
    candidate.latitude,
    candidate.longitude,
  )
  if (distanceMeters > MAX_MATCH_DISTANCE_METERS) return null

  const targetPhone = normalizePhone(target.phone)
  const candidatePhone = normalizePhone(candidate.phone)
  if (targetPhone && candidatePhone && targetPhone !== candidatePhone) {
    return null
  }

  const targetAddress = target.roadAddress ?? target.address
  const hasMatchingAddressNumber = intersects(
    addressNumbers(targetAddress),
    addressNumbers(candidate.address),
  )
  if (
    !hasMatchingAddressNumber &&
    distanceMeters > CLOSE_MATCH_DISTANCE_METERS
  ) {
    return null
  }

  const nameScore = exactName ? 0.55 : 0.45
  const distanceScore =
    distanceMeters <= CLOSE_MATCH_DISTANCE_METERS ? 0.3 : 0.2
  const addressScore = hasMatchingAddressNumber ? 0.2 : 0
  const phoneScore = targetPhone && targetPhone === candidatePhone ? 0.1 : 0

  return {
    candidate,
    confidence: Math.min(
      1,
      nameScore + distanceScore + addressScore + phoneScore,
    ),
  }
}

function normalizePhone(value: string | null): string | null {
  const digits = value?.replace(/\D/g, '') ?? ''
  return digits.length >= 8 ? digits.slice(-8) : null
}

function normalizeText(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('ko')
    .replace(/[^\p{L}\p{N}]/gu, '')
}

function addressNumbers(value: string): Set<string> {
  return new Set(value.normalize('NFKC').match(/\d+(?:-\d+)?/g) ?? [])
}

function intersects(left: Set<string>, right: Set<string>): boolean {
  for (const value of left) {
    if (right.has(value)) return true
  }
  return false
}
