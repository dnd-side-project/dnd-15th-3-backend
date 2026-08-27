import { getMetadataArgsStorage } from 'typeorm'
import { MeetingStatus } from '../enums/meeting-status.enum'
import { Meeting } from './meeting.entity'

describe('Meeting entity', () => {
  describe('isCourseGenerating', () => {
    it('status가 CourseGenerating이면 true를 반환한다', () => {
      const meeting = Object.assign(new Meeting(), {
        status: MeetingStatus.CourseGenerating,
      })

      expect(meeting.isCourseGenerating()).toBe(true)
    })

    it('status가 CourseGenerating이 아니면 false를 반환한다', () => {
      const meeting = Object.assign(new Meeting(), {
        status: MeetingStatus.CourseGenerationFailed,
      })

      expect(meeting.isCourseGenerating()).toBe(false)
    })
  })

  describe('isCourseGenerationFailed', () => {
    it('status가 CourseGenerationFailed이면 true를 반환한다', () => {
      const meeting = Object.assign(new Meeting(), {
        status: MeetingStatus.CourseGenerationFailed,
      })

      expect(meeting.isCourseGenerationFailed()).toBe(true)
    })

    it('status가 CourseGenerationFailed가 아니면 false를 반환한다', () => {
      const meeting = Object.assign(new Meeting(), {
        status: MeetingStatus.CourseGenerating,
      })

      expect(meeting.isCourseGenerationFailed()).toBe(false)
    })
  })
  it('nullable course image columns keep explicit PostgreSQL types', () => {
    const columns = getMetadataArgsStorage().columns.filter(
      (column) => column.target === Meeting,
    )
    const optionsByProperty = new Map(
      columns.map((column) => [column.propertyName, column.options]),
    )

    expect(optionsByProperty.get('courseImageKey')).toMatchObject({
      type: 'varchar',
      nullable: true,
      unique: true,
    })
    expect(optionsByProperty.get('courseImageUploadedAt')).toMatchObject({
      type: 'timestamp',
      nullable: true,
    })
  })
})
