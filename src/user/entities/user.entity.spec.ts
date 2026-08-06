import { getMetadataArgsStorage } from 'typeorm'
import { ProfileAvatarId } from '../enums/profile-avatar-id.enum'
import { User } from './user.entity'

describe('User entity', () => {
  it('declares profileAvatarId as a nullable varchar column', () => {
    const column = getMetadataArgsStorage().columns.find(
      ({ propertyName, target }) =>
        target === User && propertyName === 'profileAvatarId',
    )

    expect(column?.options).toMatchObject({
      type: 'varchar',
      nullable: true,
      length: 255,
    })
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
