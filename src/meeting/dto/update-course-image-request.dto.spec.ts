import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { UpdateCourseImageRequestDto } from './update-course-image-request.dto'

describe('UpdateCourseImageRequestDto', () => {
  it('courseImageKey가 있으면 통과한다', async () => {
    const dto = plainToInstance(UpdateCourseImageRequestDto, {
      courseImageKey: 'course-cards/1/5.png',
    })

    expect(await validate(dto)).toHaveLength(0)
  })

  it('courseImageKey가 없으면 실패한다', async () => {
    const dto = plainToInstance(UpdateCourseImageRequestDto, {})

    const errors = await validate(dto)
    expect(errors).toHaveLength(1)
    expect(errors[0].constraints).toHaveProperty('isNotEmpty')
  })

  it('courseImageKey가 빈 문자열이면 실패한다', async () => {
    const dto = plainToInstance(UpdateCourseImageRequestDto, {
      courseImageKey: '',
    })

    const errors = await validate(dto)
    expect(errors).toHaveLength(1)
    expect(errors[0].constraints).toHaveProperty('isNotEmpty')
  })

  it('courseImageKey가 문자열이 아니면 실패한다', async () => {
    const dto = plainToInstance(UpdateCourseImageRequestDto, {
      courseImageKey: 123,
    })

    const errors = await validate(dto)
    expect(errors.length).toBeGreaterThan(0)
  })
})
