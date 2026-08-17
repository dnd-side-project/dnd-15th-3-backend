import { getMetadataArgsStorage } from 'typeorm'
import { Meeting } from './meeting.entity'

describe('Meeting entity', () => {
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
