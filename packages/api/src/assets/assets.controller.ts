import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AssetsService } from './assets.service';

@ApiTags('assets')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get()
  @ApiOperation({ summary: 'List all assets (optionally filtered by site)' })
  @ApiQuery({ name: 'siteId', required: false })
  async findAll(@Query('siteId') siteId?: string) {
    return this.assetsService.findAll(siteId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get asset details with hierarchy' })
  async findOne(@Param('id') id: string) {
    return this.assetsService.findOne(id);
  }

  @Get(':id/readings')
  @ApiOperation({ summary: 'Query sensor readings for an asset' })
  @ApiQuery({ name: 'sensorType', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'resolution', required: false, enum: ['raw', '1h', '1d'] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getReadings(
    @Param('id') id: string,
    @Query('sensorType') sensorType?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('resolution') resolution?: string,
    @Query('limit') limit?: number,
  ) {
    return this.assetsService.getReadings(id, { sensorType, from, to, resolution, limit });
  }
}
