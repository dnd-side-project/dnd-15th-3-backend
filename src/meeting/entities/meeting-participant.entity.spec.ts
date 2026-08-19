import { ProfileAvatarId } from 'src/user/enums/profile-avatar-id.enum'
import { getMetadataArgsStorage } from 'typeorm'
import { MeetingParticipant } from './meeting-participant.entity'

describe('MeetingParticipant entity', () => {
  it('declares the profile avatar as a participant-scoped column', () => {
    const column = getMetadataArgsStorage().columns.find(
      ({ propertyName, target }) =>
        target === MeetingParticipant && propertyName === 'profileAvatarId',
    )

    expect(column?.options).toMatchObject({
      type: 'varchar',
      length: 255,
    })
    expect(column?.options.nullable).not.toBe(true)
  })

  it('uses the stable profile avatar identifier values', () => {
    expect(Object.values(ProfileAvatarId)).toEqual([
      'momo-blue',
      'momo-yellow',
      'momo-purple',
      'momo-pink',
      'momo-green',
    ])
  })
})
