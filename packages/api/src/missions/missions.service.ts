import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMissionDto } from './dto';

@Injectable()
export class MissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(siteId?: string) {
    return this.prisma.mission.findMany({
      where: siteId ? { siteId } : undefined,
      include: { robot: true, site: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(missionId: string) {
    const mission = await this.prisma.mission.findUnique({
      where: { missionId },
      include: { robot: true, site: true },
    });
    if (!mission) throw new NotFoundException('Mission not found');
    return mission;
  }

  async create(dto: CreateMissionDto) {
    return this.prisma.mission.create({
      data: {
        name: dto.name,
        description: dto.description,
        siteId: dto.siteId,
        robotId: dto.robotId,
        cronExpression: dto.cronExpression,
        inspectionPoints: (dto.inspectionPoints ?? []) as unknown as Prisma.InputJsonValue,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      },
      include: { robot: true, site: true },
    });
  }

  async updateStatus(missionId: string, status: string) {
    return this.prisma.mission.update({
      where: { missionId },
      data: {
        status,
        ...(status === 'running' ? { startedAt: new Date() } : {}),
        ...(status === 'completed' || status === 'failed' ? { completedAt: new Date() } : {}),
      },
    });
  }
}
