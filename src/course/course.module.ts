import { Module } from '@nestjs/common'
import { CourseController } from './course.controller'

@Module({
  controllers: [CourseController],
})
export class CourseModule {}
