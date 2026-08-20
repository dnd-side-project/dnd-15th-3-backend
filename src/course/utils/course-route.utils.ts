export function secondsToMinutes(seconds: number | null): number | null {
  if (seconds === null) {
    return null
  }
  return Math.round(seconds / 60)
}

export function metersToKilometers(meters: number): number {
  return Math.round(meters / 100) / 10
}
