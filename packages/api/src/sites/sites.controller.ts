import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { SitesService } from './sites.service';

@ApiTags('sites')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('sites')
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Get()
  @ApiOperation({ summary: 'List all sites' })
  async findAll() {
    return this.sitesService.findAll();
  }
}
