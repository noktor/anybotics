import { Controller, Get, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequireRoles } from '../auth/decorators/roles.decorator';
import { AnomaliesService } from './anomalies.service';

@ApiTags('anomalies')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('anomalies')
export class AnomaliesController {
  constructor(private readonly anomaliesService: AnomaliesService) {}

  @Get()
  @ApiOperation({ summary: 'List anomalies with filters' })
  @RequireRoles('admin', 'operator', 'maintenance_engineer')
  @ApiQuery({ name: 'assetId', required: false })
  @ApiQuery({ name: 'severity', required: false, enum: ['low', 'medium', 'high', 'critical'] })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'acknowledged', required: false, type: Boolean })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async findAll(
    @Query('assetId') assetId?: string,
    @Query('severity') severity?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('acknowledged') acknowledged?: boolean,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.anomaliesService.findAll({ assetId, severity, from, to, acknowledged, limit, offset });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get anomaly details' })
  @RequireRoles('admin', 'operator', 'maintenance_engineer')
  async findOne(@Param('id') id: string) {
    return this.anomaliesService.findOne(id);
  }

  @Patch(':id/acknowledge')
  @ApiOperation({ summary: 'Acknowledge an anomaly' })
  @RequireRoles('admin', 'operator', 'maintenance_engineer')
  async acknowledge(@Param('id') id: string) {
    return this.anomaliesService.acknowledge(id);
  }
}
