import { ArgumentMetadata, BadRequestException } from '@nestjs/common'
import { BigIntStringPipe, INVALID_FORMAT_REASON } from './bigint-string.pipe'

describe('BigIntStringPipe', () => {
  const pipe = new BigIntStringPipe()
  const metadata: ArgumentMetadata = { type: 'param', data: 'meetingId' }

  it('1 이상이고 앞자리에 0이 없는 숫자 문자열이면 그대로 반환한다', () => {
    expect(pipe.transform('1', metadata)).toBe('1')
    expect(pipe.transform('123', metadata)).toBe('123')
  })

  it('JS number 정밀도를 넘는 큰 값도 string 그대로 반환한다', () => {
    const huge = '99999999999999999999'
    expect(pipe.transform(huge, metadata)).toBe(huge)
  })

  it('0이면 BadRequestException을 던진다', () => {
    expect(() => pipe.transform('0', metadata)).toThrow(BadRequestException)
  })

  it('앞자리에 0이 있으면 BadRequestException을 던진다', () => {
    expect(() => pipe.transform('01', metadata)).toThrow(BadRequestException)
    expect(() => pipe.transform('007', metadata)).toThrow(BadRequestException)
  })

  it('빈 문자열이면 BadRequestException을 던진다', () => {
    expect(() => pipe.transform('', metadata)).toThrow(BadRequestException)
  })

  it('숫자가 아닌 문자열이면 BadRequestException을 던진다', () => {
    expect(() => pipe.transform('abc', metadata)).toThrow(BadRequestException)
  })

  it('숫자와 문자가 섞여 있으면 BadRequestException을 던진다', () => {
    expect(() => pipe.transform('12a', metadata)).toThrow(BadRequestException)
  })

  it('음수면 BadRequestException을 던진다', () => {
    expect(() => pipe.transform('-1', metadata)).toThrow(BadRequestException)
  })

  it('소수점이 포함되면 BadRequestException을 던진다', () => {
    expect(() => pipe.transform('1.5', metadata)).toThrow(BadRequestException)
  })

  it('공백이 포함되면 BadRequestException을 던진다', () => {
    expect(() => pipe.transform(' 1', metadata)).toThrow(BadRequestException)
    expect(() => pipe.transform('1 ', metadata)).toThrow(BadRequestException)
  })

  it('쉼표가 포함되면 BadRequestException을 던진다', () => {
    expect(() => pipe.transform('1,000', metadata)).toThrow(BadRequestException)
  })

  it('예외 응답에 파라미터 이름을 field로 담는다', () => {
    expect.assertions(1)
    try {
      pipe.transform('abc', metadata)
    } catch (error) {
      expect((error as BadRequestException).getResponse()).toEqual({
        fieldErrors: [{ field: 'meetingId', reason: INVALID_FORMAT_REASON }],
      })
    }
  })

  it('다른 파라미터 이름으로 호출되면 그 이름을 field로 담는다', () => {
    expect.assertions(1)
    try {
      pipe.transform('abc', { type: 'param', data: 'courseId' })
    } catch (error) {
      expect((error as BadRequestException).getResponse()).toEqual({
        fieldErrors: [{ field: 'courseId', reason: INVALID_FORMAT_REASON }],
      })
    }
  })
})
