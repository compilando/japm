import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  TypeOrmHealthIndicator,
  HealthCheck,
} from '@nestjs/terminus';
import { PrismaHealthIndicator } from './prisma.health';
import { ThrottleHealth } from '../common/decorators/throttle.decorator';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prismaHealth: PrismaHealthIndicator,
  ) { }

  @Get()
  @HealthCheck()
  @ThrottleHealth()
  check() {
    return this.health.check([() => this.prismaHealth.isHealthy('prisma')]);
  }
}
