import { MeetingTypeCode } from './enums/meeting-type-code.enum'

export const MEETING_TYPE_DEFINITIONS = [
  { code: MeetingTypeCode.Social, name: '친목', displayOrder: 1 },
  {
    code: MeetingTypeCode.DatingHobby,
    name: '데이트·취미',
    displayOrder: 2,
  },
  { code: MeetingTypeCode.CompanyDinner, name: '회식', displayOrder: 3 },
  { code: MeetingTypeCode.Family, name: '가족모임', displayOrder: 4 },
  { code: MeetingTypeCode.Travel, name: '여행', displayOrder: 5 },
  { code: MeetingTypeCode.Study, name: '스터디', displayOrder: 6 },
  { code: MeetingTypeCode.Business, name: '비즈니스', displayOrder: 7 },
  {
    code: MeetingTypeCode.AnniversaryExercise,
    name: '기념일·운동',
    displayOrder: 8,
  },
  { code: MeetingTypeCode.Other, name: '기타', displayOrder: 9 },
] as const
