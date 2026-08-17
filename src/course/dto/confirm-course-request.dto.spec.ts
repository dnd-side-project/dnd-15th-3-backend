import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { ConfirmCourseRequestDto } from './confirm-course-request.dto'

describe('ConfirmCourseRequestDto', () => {
  it('courseImageKey를 생략하면 통과한다', async () => {
    const dto = plainToInstance(ConfirmCourseRequestDto, {})

    expect(await validate(dto)).toHaveLength(0)
  })

  it('courseImageKey가 있으면 통과한다', async () => {
    const dto = plainToInstance(ConfirmCourseRequestDto, {
      courseImageKey: 'course-cards/1/5.png',
    })

    expect(await validate(dto)).toHaveLength(0)
  })

  it('courseImageKey가 빈 문자열이면 실패한다', async () => {
    const dto = plainToInstance(ConfirmCourseRequestDto, {
      courseImageKey: '',
    })

    const errors = await validate(dto)
    expect(errors).toHaveLength(1)
    expect(errors[0].constraints).toHaveProperty('isNotEmpty')
  })

  it('courseImageKey가 문자열이 아니면 실패한다', async () => {
    const dto = plainToInstance(ConfirmCourseRequestDto, {
      courseImageKey: 123,
    })

    const errors = await validate(dto)
    expect(errors.length).toBeGreaterThan(0)
  })
})
