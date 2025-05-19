import { Controller, Get, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from './auth/decorators/roles.decorator';
import { Role } from './common/enums/role.enum';
import { RolesGuard } from './auth/guards/roles.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Autenticación y Roles')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get('admin-check')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Verificar acceso de administrador', description: 'Endpoint para verificar si el usuario tiene rol de administrador' })
  @ApiResponse({ status: 200, description: 'Acceso concedido como administrador' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado - Se requiere rol de administrador' })
  adminCheck() {
    return { message: '¡Acceso de administrador concedido!' };
  }

  @Get('tenant-admin-check')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.TENANT_ADMIN)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Verificar acceso de administrador de tenant', description: 'Endpoint para verificar si el usuario tiene rol de administrador de tenant' })
  @ApiResponse({ status: 200, description: 'Acceso concedido como administrador de tenant' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado - Se requiere rol de administrador de tenant' })
  tenantAdminCheck() {
    return { message: '¡Acceso de administrador de tenant concedido!' };
  }

  @Get('user-check')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.USER)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Verificar acceso de usuario', description: 'Endpoint para verificar si el usuario tiene rol de usuario básico' })
  @ApiResponse({ status: 200, description: 'Acceso concedido como usuario' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado - Se requiere rol de usuario' })
  userCheck() {
    return { message: '¡Acceso de usuario concedido!' };
  }

  @Get('any-authenticated-check')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Verificar autenticación', description: 'Endpoint para verificar si el usuario está autenticado (sin requerir rol específico)' })
  @ApiResponse({ status: 200, description: 'Acceso concedido - Usuario autenticado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  anyAuthenticatedCheck() {
    return { message: '¡Acceso autenticado concedido (sin rol específico)!' };
  }
}
