import { Controller, Get, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from './auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { RolesGuard } from './auth/guards/roles.guard';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('admin-check')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  adminCheck() {
    return { message: '¡Acceso de administrador concedido!' };
  }

  @Get('tenant-admin-check')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.TENANT_ADMIN)
  tenantAdminCheck() {
    return { message: '¡Acceso de administrador de tenant concedido!' };
  }

  @Get('user-check')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.USER)
  userCheck() {
    return { message: '¡Acceso de usuario concedido!' };
  }

  @Get('any-authenticated-check')
  @UseGuards(AuthGuard('jwt'))
  anyAuthenticatedCheck() {
    return { message: '¡Acceso autenticado concedido (sin rol específico)!' };
  }
}
