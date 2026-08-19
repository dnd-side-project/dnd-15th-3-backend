import { MODULE_METADATA } from '@nestjs/common/constants'
import { MediaModule } from './media.module'
import { MediaService } from './media.service'

describe('MediaModule', () => {
  it('exports only the domain-facing media service', () => {
    const exports = Reflect.getMetadata(MODULE_METADATA.EXPORTS, MediaModule) as
      | unknown[]
      | undefined

    expect(exports).toEqual([MediaService])
  })

  it('does not expose generic storage controllers or Swagger paths', () => {
    const controllers = Reflect.getMetadata(
      MODULE_METADATA.CONTROLLERS,
      MediaModule,
    ) as unknown[] | undefined

    expect(controllers ?? []).toEqual([])
  })
})
