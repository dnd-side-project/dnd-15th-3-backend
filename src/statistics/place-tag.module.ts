import { Module } from '@nestjs/common'
import { PlaceTagRepository } from './place-tag.repository'

@Module({
  providers: [PlaceTagRepository],
  exports: [PlaceTagRepository],
})
export class PlaceTagModule {}
