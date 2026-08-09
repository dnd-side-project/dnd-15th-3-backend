import { ApiProperty } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsString, Length } from 'class-validator'

export class CreateCourseCommentRequestDto {
  @ApiProperty({
    description: '댓글 내용',
    example: '여기 코스 좋아요!',
    minLength: 1,
    maxLength: 300,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 300)
  content!: string
}
