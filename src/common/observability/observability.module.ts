import { Global, Module } from '@nestjs/common'
import { MetricsService } from './metrics.service'
import { MetricsServerService } from './metrics-server.service'

@Global()
@Module({
  providers: [MetricsService, MetricsServerService],
  exports: [MetricsService],
})
export class ObservabilityModule {}
