import {
  Injectable,
  NotFoundException,
  Logger,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Tenant, Prisma, Role } from '@prisma/client';
import { CreateTenantDto, UpdateTenantDto } from './dto';
import { UserService } from '../user/user.service';
import { CreateUserDto } from '../user/dto/create-user.dto';

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(
    private prisma: PrismaService,
    private userService: UserService,
  ) { }

  async create(createTenantDto: CreateTenantDto): Promise<Tenant> {
    const {
      name,
      /* description, */ marketplaceRequiresApproval,
      initialAdminUser,
    } = createTenantDto;

    const existingTenantByName = await this.prisma.tenant.findFirst({
      where: { name }, // Cambiado a findFirst
      select: { id: true },
    });
    if (existingTenantByName) {
      throw new ConflictException(`Tenant with name "${name}" already exists.`);
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const newTenant = await tx.tenant.create({
          data: {
            name,
            // description: description, // Eliminado
            marketplaceRequiresApproval: marketplaceRequiresApproval ?? true,
          },
        });
        this.logger.log(
          `Tenant created: ${newTenant.name} (ID: ${newTenant.id})`,
        );

        const adminUserDto: CreateUserDto = {
          email: initialAdminUser.email,
          password: initialAdminUser.password,
          name: initialAdminUser.name || 'Tenant Admin',
          role: Role.tenant_admin,
        };

        await this.userService.create(adminUserDto, newTenant.id);
        this.logger.log(
          `Initial admin user created for tenant ${newTenant.id}: ${adminUserDto.email}`,
        );

        return newTenant;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        this.logger.error(
          `Unique constraint violation during tenant creation for name "${name}": ${error.message}`,
          error.stack,
          error.meta,
        );
        throw new ConflictException(
          `Tenant creation failed. A tenant with name "${name}" might already exist or the initial admin email is already in use.`,
        );
      }
      this.logger.error(
        `Error creating tenant "${name}": ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findAll(): Promise<Tenant[]> {
    this.logger.log('Fetching all tenants.');
    return this.prisma.tenant.findMany();
  }

  async findOne(id: string): Promise<Tenant> {
    this.logger.log(`Fetching tenant with ID: ${id}`);
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
    });
    if (!tenant) {
      this.logger.warn(`Tenant not found for ID: ${id}`);
      throw new NotFoundException(`Tenant with ID "${id}" not found.`);
    }
    return tenant;
  }

  async update(id: string, updateTenantDto: UpdateTenantDto): Promise<Tenant> {
    const { name, /* description, */ marketplaceRequiresApproval } =
      updateTenantDto;
    this.logger.log(
      `Updating tenant with ID: ${id} with data: ${JSON.stringify(updateTenantDto)}`,
    );

    const existingTenant = await this.findOne(id);

    if (name && name !== existingTenant.name) {
      const tenantWithNewName = await this.prisma.tenant.findFirst({
        where: { name }, // Cambiado a findFirst
        select: { id: true },
      });
      if (tenantWithNewName && tenantWithNewName.id !== id) {
        throw new ConflictException(
          `Another tenant with name "${name}" already exists.`,
        );
      }
    }

    try {
      return await this.prisma.tenant.update({
        where: { id },
        data: {
          name,
          // description, // Eliminado
          marketplaceRequiresApproval,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        this.logger.error(
          `Unique constraint violation (likely name) updating tenant ID '${id}' to name '${name}': ${error.message}`,
          error.stack,
          error.meta,
        );
        throw new ConflictException(
          `Update failed. A tenant with name "${name}" might already exist.`,
        );
      }
      this.logger.error(
        `Error updating tenant ID '${id}': ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async remove(id: string): Promise<Tenant> {
    this.logger.log(`Attempting to remove tenant with ID: ${id}`);
    await this.findOne(id);

    try {
      const deletedTenant = await this.prisma.tenant.delete({
        where: { id },
      });
      this.logger.log(`Tenant removed: ${deletedTenant.name} (ID: ${id})`);
      return deletedTenant;
    } catch (error) {
      this.logger.error(
        `Error removing tenant ID '${id}': ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getMarketplaceRequiresApproval(tenantId: string): Promise<boolean> {
    this.logger.log(
      `Fetching marketplace approval requirement for Tenant ID: ${tenantId}`,
    );
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { marketplaceRequiresApproval: true },
    });

    if (!tenant) {
      this.logger.warn(
        `Tenant not found for ID: ${tenantId} when checking marketplace approval`,
      );
      throw new NotFoundException(`Tenant with ID "${tenantId}" not found.`);
    }

    // Si marketplaceRequiresApproval es null o undefined en la BD, por defecto es true
    const requiresApproval = tenant.marketplaceRequiresApproval ?? true;
    this.logger.debug(
      `Marketplace approval for Tenant ID ${tenantId}: ${requiresApproval}`,
    );
    return requiresApproval;
  }
}
