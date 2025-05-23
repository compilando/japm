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
import { Role } from '../auth/enums/role.enum';

@ApiTags('Tenants')
@ApiBearerAuth()
@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) { }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Create new tenant',
    description: 'Creates a new tenant in the system. This operation requires global admin privileges.'
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Tenant successfully created',
    type: TenantDto
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data - Check the request body format'
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Tenant name already exists - The provided name is already in use'
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Invalid or expired token'
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Global admin role required'
  })
  create(@Body() createTenantDto: CreateTenantDto): Promise<TenantDto> {
    return this.tenantService.create(createTenantDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Get all tenants',
    description: 'Retrieves a list of all tenants in the system. This operation requires global admin privileges.'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of tenants retrieved successfully',
    type: [TenantDto]
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Invalid or expired token'
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Global admin role required'
  })
  findAll(): Promise<TenantDto[]> {
    return this.tenantService.findAll();
  }

  @Get(':tenantId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({
    summary: 'Get tenant by ID',
    description: 'Retrieves a specific tenant by their unique ID. Accessible by global admins or tenant admins of the specified tenant.'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tenant found successfully',
    type: TenantDto
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Tenant not found - The specified ID does not exist'
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Invalid or expired token'
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Insufficient permissions to access this tenant'
  })
  @ApiParam({
    name: 'tenantId',
    type: 'string',
    format: 'uuid',
    description: 'Unique tenant identifier (UUID)',
    required: true
  })
  async findOne(
    @Param('tenantId') tenantId: string,
    @Req() req: any,
  ): Promise<TenantDto> {
    if (req.user.role === Role.TENANT_ADMIN && req.user.tenantId !== tenantId) {
      throw new ForbiddenException(
        'You are not authorized to access this tenant.'
      );
    }
    return this.tenantService.findOne(tenantId);
  }

  @Patch(':tenantId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TENANT_ADMIN)
  @ApiOperation({
    summary: 'Update tenant',
    description: 'Updates an existing tenant\'s information. Accessible by global admins or tenant admins of the specified tenant.'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tenant updated successfully',
    type: TenantDto
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Tenant not found - The specified ID does not exist'
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data - Check the request body format'
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Tenant name already exists - The provided name is already in use'
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Invalid or expired token'
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Insufficient permissions to update this tenant'
  })
  @ApiParam({
    name: 'tenantId',
    type: 'string',
    format: 'uuid',
    description: 'Unique tenant identifier to update (UUID)',
    required: true
  })
  async update(
    @Param('tenantId') tenantId: string,
    @Body() updateTenantDto: UpdateTenantDto,
    @Req() req: any,
  ): Promise<TenantDto> {
    if (req.user.role === Role.TENANT_ADMIN && req.user.tenantId !== tenantId) {
      throw new ForbiddenException(
        'You are not authorized to update this tenant.'
      );
    }
    return this.tenantService.update(tenantId, updateTenantDto);
  }

  @Delete(':tenantId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete tenant',
    description: 'Permanently deletes a tenant from the system. This is a destructive operation that requires global admin privileges.'
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Tenant successfully deleted'
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Tenant not found - The specified ID does not exist'
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Invalid or expired token'
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Global admin role required'
  })
  @ApiParam({
    name: 'tenantId',
    type: 'string',
    format: 'uuid',
    description: 'Unique tenant identifier to delete (UUID)',
    required: true
  })
  async remove(
    @Param('tenantId') tenantId: string,
  ): Promise<void> {
    await this.tenantService.remove(tenantId);
  }
}
