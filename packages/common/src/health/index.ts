import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get('live')
  @ApiOperation({ summary: 'Liveness probe' })
  live() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe' })
  ready() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
