import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RobotsService } from './robots.service';

@ApiTags('robots')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('robots')
export class RobotsController {
  constructor(private readonly robotsService: RobotsService) {}

  @Get()
  @ApiOperation({ summary: 'List all robots' })
  async findAll() {
    return this.robotsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get robot details' })
  async findOne(@Param('id') id: string) {
    return this.robotsService.findOne(id);
  }

  @Get('poses/latest')
  @ApiOperation({ summary: 'Get latest pose for all robots' })
  async getLatestPoses() {
    return this.robotsService.getLatestPoses();
  }

  @Get(':id/telemetry')
  @ApiOperation({ summary: 'Query time-series telemetry for a robot' })
  @ApiQuery({ name: 'sensorType', required: false })
  @ApiQuery({ name: 'from', required: false, description: 'ISO timestamp' })
  @ApiQuery({ name: 'to', required: false, description: 'ISO timestamp' })
  @ApiQuery({ name: 'resolution', required: false, enum: ['raw', '1h', '1d'] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getTelemetry(
    @Param('id') id: string,
    @Query('sensorType') sensorType?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('resolution') resolution?: string,
    @Query('limit') limit?: number,
  ) {
    return this.robotsService.getTelemetry(id, { sensorType, from, to, resolution, limit });
  }

  @Get(':id/poses')
  @ApiOperation({ summary: 'Get pose trail for a robot' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getPoseTrail(
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: number,
  ) {
    return this.robotsService.getPoseTrail(id, { from, to, limit });
  }
}
