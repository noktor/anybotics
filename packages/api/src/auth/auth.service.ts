import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  siteIds: string[];
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = {
      sub: user.userId,
      email: user.email,
      role: user.role,
      siteIds: user.siteIds,
    };

    return {
      accessToken: this.jwt.sign(payload),
      user: {
        userId: user.userId,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async register(email: string, password: string, name: string, role = 'viewer') {
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: { email, passwordHash, name, role },
    });

    return {
      userId: user.userId,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

  async validateUser(payload: JwtPayload) {
    return this.prisma.user.findUnique({
      where: { userId: payload.sub },
      select: { userId: true, email: true, name: true, role: true, siteIds: true },
    });
  }
}
