import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('trends')
  @ApiOperation({ summary: 'Get trendline data for a sensor on an asset' })
  @ApiQuery({ name: 'assetId', required: true })
  @ApiQuery({ name: 'sensorType', required: true })
  @ApiQuery({ name: 'from', required: true })
  @ApiQuery({ name: 'to', required: true })
  @ApiQuery({ name: 'resolution', required: false, enum: ['1h', '1d'] })
  async getTrends(
    @Query('assetId') assetId: string,
    @Query('sensorType') sensorType: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('resolution') resolution?: string,
  ) {
    return this.analyticsService.getTrends({ assetId, sensorType, from, to, resolution });
  }

  @Get('comparison')
  @ApiOperation({ summary: 'Compare asset conditions across two time periods' })
  @ApiQuery({ name: 'assetId', required: true })
  @ApiQuery({ name: 'sensorType', required: true })
  @ApiQuery({ name: 'period1From', required: true })
  @ApiQuery({ name: 'period1To', required: true })
  @ApiQuery({ name: 'period2From', required: true })
  @ApiQuery({ name: 'period2To', required: true })
  async getComparison(
    @Query('assetId') assetId: string,
    @Query('sensorType') sensorType: string,
    @Query('period1From') period1From: string,
    @Query('period1To') period1To: string,
    @Query('period2From') period2From: string,
    @Query('period2To') period2To: string,
  ) {
    return this.analyticsService.getComparison({
      assetId, sensorType, period1From, period1To, period2From, period2To,
    });
  }
}
