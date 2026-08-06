import { Module } from '@nestjs/common'
import { PlaceController } from './place.controller'

@Module({
  controllers: [PlaceController],
})
export class PlaceModule {}
