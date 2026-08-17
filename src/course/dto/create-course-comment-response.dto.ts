import { ApiProperty } from '@nestjs/swagger'

export class CreateCourseCommentResponseDto {
  @ApiProperty({
    description: '댓글 ID',
    example: '1',
    pattern: '^\\d+$',
  })
  commentId!: string

  @ApiProperty({ description: '댓글 내용', example: '여기 코스 좋아요!' })
  content!: string

  @ApiProperty({
    description: '작성 시각',
    example: '2026-08-08T12:34:56.000Z',
  })
  createdAt!: string
}
