import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { CreateCourseCommentRequestDto } from './create-course-comment-request.dto'

describe('CreateCourseCommentRequestDto', () => {
  it('내용이 있으면 통과한다', async () => {
    const dto = plainToInstance(CreateCourseCommentRequestDto, {
      content: '여기 코스 좋아요!',
    })

    expect(await validate(dto)).toHaveLength(0)
  })

  it('앞뒤 공백은 제거하고 검증한다', async () => {
    const dto = plainToInstance(CreateCourseCommentRequestDto, {
      content: '  좋아요!  ',
    })

    expect(await validate(dto)).toHaveLength(0)
    expect(dto.content).toBe('좋아요!')
  })

  it('공백만 있으면 실패한다', async () => {
    const dto = plainToInstance(CreateCourseCommentRequestDto, {
      content: '   ',
    })

    const errors = await validate(dto)
    expect(errors).toHaveLength(1)
    expect(errors[0].constraints).toHaveProperty('isLength')
  })

  it('빈 문자열이면 실패한다', async () => {
    const dto = plainToInstance(CreateCourseCommentRequestDto, {
      content: '',
    })

    const errors = await validate(dto)
    expect(errors).toHaveLength(1)
    expect(errors[0].constraints).toHaveProperty('isLength')
  })

  it('300자를 초과하면 실패한다', async () => {
    const dto = plainToInstance(CreateCourseCommentRequestDto, {
      content: '가'.repeat(301),
    })

    const errors = await validate(dto)
    expect(errors).toHaveLength(1)
    expect(errors[0].constraints).toHaveProperty('isLength')
  })

  it('문자열이 아니면 실패한다', async () => {
    const dto = plainToInstance(CreateCourseCommentRequestDto, {
      content: 123,
    })

    const errors = await validate(dto)
    expect(errors.length).toBeGreaterThan(0)
  })
})
