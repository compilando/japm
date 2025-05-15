import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PrismaHealthIndicator extends HealthIndicator {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // Attempt a simple query to check connectivity
      await this.prisma.$queryRaw`SELECT 1`;
      // If successful, report the service as healthy
      return this.getStatus(key, true);
    } catch (error) {
      // If an error occurs, report the service as unhealthy
      const errorMessage =
        error instanceof Error ? error.message : 'Prisma health check failed';
      throw new HealthCheckError(
        `${key} health check failed`,
        this.getStatus(key, false, { message: errorMessage }),
      );
    }
  }
}
