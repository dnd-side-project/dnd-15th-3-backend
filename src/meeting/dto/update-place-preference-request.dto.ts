import { ApiProperty } from '@nestjs/swagger'
import { PreferenceType } from 'src/course/enums/preference-type.enum'

export class UpdatePlacePreferenceRequestDto {
  @ApiProperty({
    description: '설정할 반응. null이면 기존 반응을 취소합니다.',
    enum: PreferenceType,
    enumName: 'PreferenceType',
    example: PreferenceType.Like,
    nullable: true,
  })
  preference!: PreferenceType | null
}
