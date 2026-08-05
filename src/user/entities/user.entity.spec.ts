import { getMetadataArgsStorage } from 'typeorm'
import { User } from './user.entity'

describe('User entity', () => {
  it('declares profileImageKey as a nullable varchar column', () => {
    const column = getMetadataArgsStorage().columns.find(
      ({ propertyName, target }) =>
        target === User && propertyName === 'profileImageKey',
    )

    expect(column?.options).toMatchObject({
      type: 'varchar',
      nullable: true,
      length: 255,
    })
  })
})
