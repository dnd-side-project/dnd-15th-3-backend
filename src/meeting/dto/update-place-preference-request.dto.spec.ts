import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { PreferenceType } from 'src/course/enums/preference-type.enum'
import { UpdatePlacePreferenceRequestDto } from './update-place-preference-request.dto'

describe('UpdatePlacePreferenceRequestDto', () => {
  it('LIKE면 통과한다', async () => {
    const dto = plainToInstance(UpdatePlacePreferenceRequestDto, {
      preference: PreferenceType.Like,
    })

    expect(await validate(dto)).toHaveLength(0)
  })

  it('DISLIKE면 통과한다', async () => {
    const dto = plainToInstance(UpdatePlacePreferenceRequestDto, {
      preference: PreferenceType.Dislike,
    })

    expect(await validate(dto)).toHaveLength(0)
  })

  it('null이면 통과한다 (반응 취소)', async () => {
    const dto = plainToInstance(UpdatePlacePreferenceRequestDto, {
      preference: null,
    })

    expect(await validate(dto)).toHaveLength(0)
  })

  it('필드를 생략하면 실패한다', async () => {
    const dto = plainToInstance(UpdatePlacePreferenceRequestDto, {})

    const errors = await validate(dto)
    expect(errors).toHaveLength(1)
    expect(errors[0].constraints).toHaveProperty('isEnum')
  })

  it('enum에 없는 문자열이면 실패한다', async () => {
    const dto = plainToInstance(UpdatePlacePreferenceRequestDto, {
      preference: 'like',
    })

    const errors = await validate(dto)
    expect(errors).toHaveLength(1)
    expect(errors[0].constraints).toHaveProperty('isEnum')
  })

  it('숫자면 실패한다', async () => {
    const dto = plainToInstance(UpdatePlacePreferenceRequestDto, {
      preference: 1,
    })

    const errors = await validate(dto)
    expect(errors).toHaveLength(1)
    expect(errors[0].constraints).toHaveProperty('isEnum')
  })
})
