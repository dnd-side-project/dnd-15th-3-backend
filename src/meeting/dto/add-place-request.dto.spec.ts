import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { INVALID_FORMAT_REASON } from 'src/common/pipes/bigint-string.pipe'
import { AddPlaceRequestDto } from './add-place-request.dto'

describe('AddPlaceRequestDto', () => {
  it('숫자로만 이루어진 문자열이면 통과한다', async () => {
    const dto = plainToInstance(AddPlaceRequestDto, { placeId: '1' })

    expect(await validate(dto)).toHaveLength(0)
  })

  it('숫자가 아닌 문자열이면 실패한다', async () => {
    const dto = plainToInstance(AddPlaceRequestDto, { placeId: 'abc' })

    const errors = await validate(dto)
    expect(errors).toHaveLength(1)
    expect(errors[0].constraints).toMatchObject({
      matches: INVALID_FORMAT_REASON,
    })
  })

  it('숫자 타입으로 오면 실패한다', async () => {
    const dto = plainToInstance(AddPlaceRequestDto, { placeId: 1 })

    const errors = await validate(dto)
    expect(errors.length).toBeGreaterThan(0)
  })

  it('빈 문자열이면 실패한다', async () => {
    const dto = plainToInstance(AddPlaceRequestDto, { placeId: '' })

    const errors = await validate(dto)
    expect(errors).toHaveLength(1)
    expect(errors[0].constraints).toMatchObject({
      matches: INVALID_FORMAT_REASON,
    })
  })
})
