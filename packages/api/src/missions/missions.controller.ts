import { Controller, Get, Post, Patch, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequireRoles } from '../auth/decorators/roles.decorator';
import { MissionsService } from './missions.service';
import { CreateMissionDto } from './dto';

@ApiTags('missions')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('missions')
export class MissionsController {
  constructor(private readonly missionsService: MissionsService) {}

  @Get()
  @ApiOperation({ summary: 'List all missions' })
  @RequireRoles('admin', 'operator')
  @ApiQuery({ name: 'siteId', required: false })
  async findAll(@Query('siteId') siteId?: string) {
    return this.missionsService.findAll(siteId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get mission details' })
  @RequireRoles('admin', 'operator')
  async findOne(@Param('id') id: string) {
    return this.missionsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create and schedule a new mission' })
  @RequireRoles('admin', 'operator')
  async create(@Body() dto: CreateMissionDto) {
    return this.missionsService.create(dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update mission status' })
  @RequireRoles('admin', 'operator')
  async updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.missionsService.updateStatus(id, status);
  }
}
