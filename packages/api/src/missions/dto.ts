import { IsString, IsOptional, IsArray, IsDateString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class CreateMissionDto {
  @ApiProperty({ example: 'Turbine Hall Inspection' })
  @IsString()
  name!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'a0000000-0000-0000-0000-000000000001' })
  @Matches(UUID_REGEX, { message: 'siteId must be a valid UUID' })
  siteId!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Matches(UUID_REGEX, { message: 'robotId must be a valid UUID' })
  robotId?: string;

  @ApiProperty({ required: false, example: '0 6 * * 2,4' })
  @IsOptional()
  @IsString()
  cronExpression?: string;

  @ApiProperty({ required: false, type: [Object] })
  @IsOptional()
  @IsArray()
  inspectionPoints?: Record<string, unknown>[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}
