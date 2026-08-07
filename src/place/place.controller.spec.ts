import { NotImplementedException } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { Test } from '@nestjs/testing'
import { PlaceController } from './place.controller'

describe('PlaceController', () => {
  it('실제 데이터 연동 전까지 501을 반환한다', () => {
    const controller = new PlaceController()

    expect(() => controller.getPlaceDetail('1')).toThrow(
      NotImplementedException,
    )
  })

  it('Swagger 문서에 모든 응답 코드와 응답 스키마가 포함된다', async () => {
    const moduleFixture = await Test.createTestingModule({
      controllers: [PlaceController],
    }).compile()
    const app = moduleFixture.createNestApplication()
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().build(),
    )

    const placeDetailPath = document.paths?.['/places/{placeId}'] as
      | { get?: { responses?: Record<string, unknown> } }
      | undefined
    expect(placeDetailPath?.get?.responses).toHaveProperty('200')
    expect(placeDetailPath?.get?.responses).toHaveProperty('400')
    expect(placeDetailPath?.get?.responses).toHaveProperty('404')
    expect(placeDetailPath?.get?.responses).toHaveProperty('501')

    const schema = document.components?.schemas?.PlaceSearchResultDto as
      | { properties?: Record<string, unknown> }
      | undefined
    expect(Object.keys(schema?.properties ?? {})).toEqual(
      expect.arrayContaining(['placeId', 'category', 'name', 'address']),
    )

    await app.close()
  })
})
