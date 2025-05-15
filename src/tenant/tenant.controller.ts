import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseUUIDPipe,
  Req,
  ForbiddenException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TenantService } from './tenant.service';
import { CreateTenantDto, UpdateTenantDto, TenantDto } from './dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard'; // Asumiendo que existe
import { Roles } from '../auth/decorators/roles.decorator'; // Asumiendo que existe
import { Role } from '@prisma/client';

@ApiTags('Tenants')
@ApiBearerAuth()
@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN) // Solo ADMIN global puede crear tenants
  @ApiOperation({ summary: 'Create a new tenant' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Tenant created successfully.',
    type: TenantDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input.',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Tenant name already exists.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized.',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden resource.',
  })
  create(@Body() createTenantDto: CreateTenantDto): Promise<TenantDto> {
    return this.tenantService.create(createTenantDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN) // Solo ADMIN global puede listar todos los tenants
  @ApiOperation({ summary: 'Get all tenants' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Array of tenants.',
    type: [TenantDto],
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized.',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden resource.',
  })
  findAll(): Promise<TenantDto[]> {
    return this.tenantService.findAll();
  }

  @Get(':tenantId')
  @UseGuards(JwtAuthGuard, RolesGuard) // RolesGuard verificará si es ADMIN o TENANT_ADMIN del tenantId solicitado
  @Roles(Role.ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Get a specific tenant by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tenant object.',
    type: TenantDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Tenant not found.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized.',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden resource.',
  })
  @ApiParam({
    name: 'tenantId',
    type: 'string',
    format: 'uuid',
    description: 'The ID of the tenant',
  })
  async findOne(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Req() req: any,
  ): Promise<TenantDto> {
    // RolesGuard debería manejar la lógica de si el TENANT_ADMIN puede acceder a este tenantId.
    // Si req.user.role es TENANT_ADMIN, nos aseguramos que solo acceda a su propio tenant.
    if (req.user.role === Role.TENANT_ADMIN && req.user.tenantId !== tenantId) {
      throw new ForbiddenException(
        'You are not authorized to access this tenant.',
      );
    }
    return this.tenantService.findOne(tenantId);
  }

  @Patch(':tenantId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({ summary: 'Update a tenant by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tenant updated successfully.',
    type: TenantDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Tenant not found.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input.',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Tenant name already exists.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized.',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden resource.',
  })
  @ApiParam({
    name: 'tenantId',
    type: 'string',
    format: 'uuid',
    description: 'The ID of the tenant',
  })
  async update(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Body() updateTenantDto: UpdateTenantDto,
    @Req() req: any,
  ): Promise<TenantDto> {
    if (req.user.role === Role.TENANT_ADMIN && req.user.tenantId !== tenantId) {
      throw new ForbiddenException(
        'You are not authorized to update this tenant.',
      );
    }
    // Un TENANT_ADMIN no debería poder cambiar el nombre de su tenant si eso tiene implicaciones mayores.
    // Opcionalmente, se podría restringir qué campos puede actualizar un TENANT_ADMIN.
    // Por ahora, permitimos la actualización de los campos definidos en UpdateTenantDto.
    return this.tenantService.update(tenantId, updateTenantDto);
  }

  @Delete(':tenantId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN) // Solo ADMIN global puede eliminar tenants
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a tenant by ID (Caution: Destructive operation)',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Tenant deleted successfully.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Tenant not found.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized.',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden resource.',
  })
  @ApiParam({
    name: 'tenantId',
    type: 'string',
    format: 'uuid',
    description: 'The ID of the tenant',
  })
  async remove(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
  ): Promise<void> {
    await this.tenantService.remove(tenantId);
  }
}
