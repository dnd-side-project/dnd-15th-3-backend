import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Category } from 'src/category/entities/category.entity'
import { MeetingType } from 'src/meeting/entities/meeting-type.entity'
import { CatalogController } from './catalog.controller'
import { CatalogService } from './catalog.service'

@Module({
  imports: [TypeOrmModule.forFeature([Category, MeetingType])],
  controllers: [CatalogController],
  providers: [CatalogService],
})
export class CatalogModule {}
