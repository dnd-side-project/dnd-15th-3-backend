import { ArgumentMetadata } from '@nestjs/common'
import { CommonException } from '../exception/common.exception'
import { INVALID_FORMAT_REASON } from './bigint-string.pipe'
import { BigIntStringArrayPipe } from './bigint-string-array.pipe'

describe('BigIntStringArrayPipe', () => {
  const pipe = new BigIntStringArrayPipe()
  const metadata: ArgumentMetadata = { type: 'query', data: 'excludeIds' }

  it('값이 없으면 undefined를 그대로 반환한다', () => {
    expect(pipe.transform(undefined, metadata)).toBeUndefined()
  })

  it('숫자 문자열 하나면 원소 하나짜리 배열을 반환한다', () => {
    expect(pipe.transform('1', metadata)).toEqual(['1'])
  })

  it('콤마로 구분된 숫자 문자열이면 배열로 변환한다', () => {
    expect(pipe.transform('1,2,3', metadata)).toEqual(['1', '2', '3'])
  })

  it('빈 문자열이면 CommonException을 던진다', () => {
    expect(() => pipe.transform('', metadata)).toThrow(CommonException)
  })

  it('맨 뒤에 콤마만 있고 숫자가 없으면 CommonException을 던진다', () => {
    expect(() => pipe.transform('1,2,', metadata)).toThrow(CommonException)
  })

  it('맨 앞에 콤마만 있고 숫자가 없으면 CommonException을 던진다', () => {
    expect(() => pipe.transform(',1,2', metadata)).toThrow(CommonException)
  })

  it('중간에 빈 값이 있으면 CommonException을 던진다', () => {
    expect(() => pipe.transform('1,,2', metadata)).toThrow(CommonException)
  })

  it('콤마 뒤에 공백이 있으면 CommonException을 던진다', () => {
    expect(() => pipe.transform('1, 2, 3', metadata)).toThrow(CommonException)
  })

  it('콤마 앞에 공백이 있으면 CommonException을 던진다', () => {
    expect(() => pipe.transform('1 ,2', metadata)).toThrow(CommonException)
  })

  it('숫자가 아닌 값이 섞여 있으면 CommonException을 던진다', () => {
    expect(() => pipe.transform('1,abc,3', metadata)).toThrow(CommonException)
  })

  it('음수가 섞여 있으면 CommonException을 던진다', () => {
    expect(() => pipe.transform('1,-2', metadata)).toThrow(CommonException)
  })

  it('0이 섞여 있으면 CommonException을 던진다', () => {
    expect(() => pipe.transform('1,0,2', metadata)).toThrow(CommonException)
  })

  it('앞자리에 0이 있는 값이 섞여 있으면 CommonException을 던진다', () => {
    expect(() => pipe.transform('1,007,2', metadata)).toThrow(CommonException)
  })

  it('소수점이 섞여 있으면 CommonException을 던진다', () => {
    expect(() => pipe.transform('1,2.5', metadata)).toThrow(CommonException)
  })

  it('예외 응답에 파라미터 이름을 field로 담는다', () => {
    expect.assertions(1)
    try {
      pipe.transform('1,abc', metadata)
    } catch (error) {
      expect((error as CommonException).fieldErrors).toEqual([
        { field: 'excludeIds', reason: INVALID_FORMAT_REASON },
      ])
    }
  })

  it('다른 파라미터 이름으로 호출되면 그 이름을 field로 담는다', () => {
    expect.assertions(1)
    try {
      pipe.transform('1,abc', { type: 'query', data: 'placeIds' })
    } catch (error) {
      expect((error as CommonException).fieldErrors).toEqual([
        { field: 'placeIds', reason: INVALID_FORMAT_REASON },
      ])
    }
  })
})
