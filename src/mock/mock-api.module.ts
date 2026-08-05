import { Global, Module } from '@nestjs/common'
import { MockApiService } from './mock-api.service'

@Global()
@Module({ providers: [MockApiService], exports: [MockApiService] })
export class MockApiModule {}
