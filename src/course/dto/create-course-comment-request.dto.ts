import { ApiProperty } from '@nestjs/swagger'

export class CreateCourseCommentRequestDto {
  @ApiProperty({ description: '댓글 내용', example: '여기 코스 좋아요!' })
  content!: string
}
