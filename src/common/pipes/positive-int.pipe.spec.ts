import { ArgumentMetadata } from '@nestjs/common'
import { CommonException } from '../exception/common.exception'
import { PositiveIntPipe } from './positive-int.pipe'

describe('PositiveIntPipe', () => {
  const metadata: ArgumentMetadata = { type: 'query', data: 'size' }

  it('1 이상의 정수 문자열이면 number로 변환한다', () => {
    const pipe = new PositiveIntPipe()
    expect(pipe.transform('1', metadata)).toBe(1)
    expect(pipe.transform('5', metadata)).toBe(5)
  })

  it('값이 없고 기본값이 설정돼 있으면 기본값을 반환한다', () => {
    const pipe = new PositiveIntPipe(5)
    expect(pipe.transform(undefined, metadata)).toBe(5)
  })

  it('값이 없고 기본값도 없으면 CommonException을 던진다', () => {
    const pipe = new PositiveIntPipe()
    expect(() => pipe.transform(undefined, metadata)).toThrow(CommonException)
  })

  it('0이면 BadRequestException을 던진다', () => {
    const pipe = new PositiveIntPipe(5)
    expect(() => pipe.transform('0', metadata)).toThrow(CommonException)
  })

  it('음수면 BadRequestException을 던진다', () => {
    const pipe = new PositiveIntPipe(5)
    expect(() => pipe.transform('-1', metadata)).toThrow(CommonException)
  })

  it('소수점이 포함되면 BadRequestException을 던진다', () => {
    const pipe = new PositiveIntPipe(5)
    expect(() => pipe.transform('1.5', metadata)).toThrow(CommonException)
  })

  it('숫자가 아닌 문자열이면 BadRequestException을 던진다', () => {
    const pipe = new PositiveIntPipe(5)
    expect(() => pipe.transform('abc', metadata)).toThrow(CommonException)
  })

  it('공백이 포함되면 BadRequestException을 던진다', () => {
    const pipe = new PositiveIntPipe(5)
    expect(() => pipe.transform(' 1', metadata)).toThrow(CommonException)
  })
})
