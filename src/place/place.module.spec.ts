import { MODULE_METADATA } from '@nestjs/common/constants'
import { KakaoImagePhotoProvider } from './photo/kakao-image-photo.provider'
import { TourPlacePhotoProvider } from './photo/tour-place-photo.provider'
import { PlaceModule } from './place.module'
import { KakaoPlacesProvider } from './provider/kakao-places.provider'

describe('PlaceModule Provider wiring', () => {
  it('무료 장소·사진 Provider만 등록한다', () => {
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      PlaceModule,
    ) as unknown[]

    expect(providers).toContain(KakaoPlacesProvider)
    expect(providers).toContain(TourPlacePhotoProvider)
    expect(providers).toContain(KakaoImagePhotoProvider)
  })
})
