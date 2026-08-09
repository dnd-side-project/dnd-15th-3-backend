import { Controller, Get } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { AppService } from './app.service'

@ApiTags('앱')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({
    summary: 'API 서버 상태 확인',
    description: 'API 서버가 정상적으로 동작하는지 확인합니다.',
  })
  @ApiResponse({ status: 200, description: '서버가 정상적으로 응답했습니다.' })
  getHello(): string {
    return this.appService.getHello()
  }
}
