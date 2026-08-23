import { MODULE_METADATA } from '@nestjs/common/constants'
import { PlaceModule } from './place.module'
import { GooglePlacesProvider } from './provider/google-places.provider'
import { KakaoPlacesProvider } from './provider/kakao-places.provider'
import { PLACE_PROVIDER } from './sync/place-sync.tokens'

describe('PlaceModule Provider wiring', () => {
  it('Kakao Provider를 등록하되 장소 수집에는 Google Provider를 유지한다', () => {
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      PlaceModule,
    ) as unknown[]

    expect(providers).toContain(KakaoPlacesProvider)
    expect(providers).toContainEqual({
      provide: PLACE_PROVIDER,
      useExisting: GooglePlacesProvider,
    })
  })
})
