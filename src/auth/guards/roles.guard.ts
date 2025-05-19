import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../enums/role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const path = request.url;

    this.logger.debug(`RolesGuard - Path: ${path}`);
    this.logger.debug(
      `RolesGuard - Required roles: ${JSON.stringify(requiredRoles)}`,
    );

    if (!requiredRoles) {
      this.logger.debug('RolesGuard - No roles required, access granted.');
      return true;
    }

    const { user } = request;
    this.logger.debug(
      `RolesGuard - User from request: ${JSON.stringify(user)}`,
    );

    if (!user || !user.role) {
      this.logger.warn(
        'RolesGuard - User or user.role not found, access denied.',
      );
      return false;
    }

    const hasRequiredRole = requiredRoles.some((role) => user.role === role);
    this.logger.debug(
      `RolesGuard - User role: ${user.role}, Has required role: ${hasRequiredRole}`,
    );

    if (!hasRequiredRole) {
      const userEmailForLog = user && user.email ? user.email : 'UNKNOWN_USER';
      this.logger.warn(
        `RolesGuard - Access DENIED for user ${userEmailForLog} with role ${user.role} to path ${path} (Required: ${JSON.stringify(requiredRoles)})`,
      );
    } else {
      const userEmailForLog = user && user.email ? user.email : 'UNKNOWN_USER';
      this.logger.log(
        `RolesGuard - Access GRANTED for user ${userEmailForLog} with role ${user.role} to path ${path}`,
      );
    }
    return hasRequiredRole;
  }
}
