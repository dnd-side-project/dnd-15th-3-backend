import { metersToKilometers, secondsToMinutes } from './course-route.utils'

describe('secondsToMinutes', () => {
  it('null이면 null을 반환한다', () => {
    expect(secondsToMinutes(null)).toBeNull()
  })

  it.each([
    [0, 0],
    [29, 0],
    [30, 1],
    [90, 2],
    [480, 8],
    [649, 11],
  ])('%i초는 %i분으로 반올림된다', (seconds, expectedMinutes) => {
    expect(secondsToMinutes(seconds)).toBe(expectedMinutes)
  })
})

describe('metersToKilometers', () => {
  it.each([
    [0, 0],
    [49, 0],
    [50, 0.1],
    [650, 0.7],
    [649, 0.6],
    [1000, 1],
    [1450, 1.5],
  ])('%i미터는 %fkm로 반올림된다', (meters, expectedKilometers) => {
    expect(metersToKilometers(meters)).toBe(expectedKilometers)
  })
})
