import { getMetadataArgsStorage } from 'typeorm'
import { User } from './user.entity'

describe('User entity', () => {
  it('does not persist the meeting-scoped profile avatar on User', () => {
    const column = getMetadataArgsStorage().columns.find(
      ({ propertyName, target }) =>
        target === User && propertyName === 'profileAvatarId',
    )

    expect(column).toBeUndefined()
  })
})
