import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { INVALID_FORMAT_REASON } from 'src/common/pipes/bigint-string.pipe'
import { UpdateCoursePlacesRequestDto } from './update-course-places-request.dto'

describe('UpdateCoursePlacesRequestDto', () => {
  it('숫자로만 이루어진 id 목록이면 통과한다', async () => {
    const dto = plainToInstance(UpdateCoursePlacesRequestDto, {
      recommendationIds: ['1', '2', '3'],
    })

    expect(await validate(dto)).toHaveLength(0)
  })

  it('최대 개수(6개)까지는 통과한다', async () => {
    const dto = plainToInstance(UpdateCoursePlacesRequestDto, {
      recommendationIds: ['1', '2', '3', '4', '5', '6'],
    })

    expect(await validate(dto)).toHaveLength(0)
  })

  it('빈 배열이면 실패한다', async () => {
    const dto = plainToInstance(UpdateCoursePlacesRequestDto, {
      recommendationIds: [],
    })

    const errors = await validate(dto)
    expect(errors).toHaveLength(1)
    expect(errors[0].constraints).toMatchObject({
      arrayNotEmpty: expect.any(String),
    })
  })

  it('6개를 초과하면 실패한다', async () => {
    const dto = plainToInstance(UpdateCoursePlacesRequestDto, {
      recommendationIds: ['1', '2', '3', '4', '5', '6', '7'],
    })

    const errors = await validate(dto)
    expect(errors).toHaveLength(1)
    expect(errors[0].constraints).toMatchObject({
      arrayMaxSize: expect.any(String),
    })
  })

  it('중복된 id가 있으면 실패한다', async () => {
    const dto = plainToInstance(UpdateCoursePlacesRequestDto, {
      recommendationIds: ['1', '2', '1'],
    })

    const errors = await validate(dto)
    expect(errors).toHaveLength(1)
    expect(errors[0].constraints).toMatchObject({
      arrayUnique: expect.any(String),
    })
  })

  it('0이 포함되면 실패한다', async () => {
    const dto = plainToInstance(UpdateCoursePlacesRequestDto, {
      recommendationIds: ['0'],
    })

    const errors = await validate(dto)
    expect(errors).toHaveLength(1)
    expect(errors[0].constraints).toMatchObject({
      matches: INVALID_FORMAT_REASON,
    })
  })

  it('앞자리에 0이 있으면 실패한다', async () => {
    const dto = plainToInstance(UpdateCoursePlacesRequestDto, {
      recommendationIds: ['007'],
    })

    const errors = await validate(dto)
    expect(errors).toHaveLength(1)
    expect(errors[0].constraints).toMatchObject({
      matches: INVALID_FORMAT_REASON,
    })
  })

  it('숫자가 아닌 문자열이 포함되면 실패한다', async () => {
    const dto = plainToInstance(UpdateCoursePlacesRequestDto, {
      recommendationIds: ['abc'],
    })

    const errors = await validate(dto)
    expect(errors).toHaveLength(1)
    expect(errors[0].constraints).toMatchObject({
      matches: INVALID_FORMAT_REASON,
    })
  })

  it('음수가 포함되면 실패한다', async () => {
    const dto = plainToInstance(UpdateCoursePlacesRequestDto, {
      recommendationIds: ['-1'],
    })

    const errors = await validate(dto)
    expect(errors).toHaveLength(1)
    expect(errors[0].constraints).toMatchObject({
      matches: INVALID_FORMAT_REASON,
    })
  })
})
