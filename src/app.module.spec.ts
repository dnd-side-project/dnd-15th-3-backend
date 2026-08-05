import { MODULE_METADATA } from '@nestjs/common/constants'
import { AppModule } from './app.module'

function getModuleName(value: unknown) {
  if (typeof value === 'function') return value.name
  if (typeof value !== 'object' || value === null || !('module' in value)) {
    return undefined
  }

  return typeof value.module === 'function' ? value.module.name : undefined
}

describe('AppModule', () => {
  it('does not register the course API module', () => {
    const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, AppModule) as
      | unknown[]
      | undefined

    expect(imports?.map(getModuleName)).not.toContain('CourseModule')
  })
})
