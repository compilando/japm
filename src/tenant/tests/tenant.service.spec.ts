import { Test, TestingModule } from '@nestjs/testing';
import { TenantService } from '../tenant.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UserService } from '../../user/user.service';
import { CreateTenantDto } from '../dto/create-tenant.dto';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

describe('TenantService', () => {
    let service: TenantService;
    let prismaService: jest.Mocked<PrismaService>;
    let userService: jest.Mocked<UserService>;

    const mockTenant = {
        id: 'tenant-1',
        name: 'Test Tenant',
        marketplaceRequiresApproval: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const mockUser = {
        id: 'user-1',
        email: 'admin@test.com',
        name: 'Admin User',
        password: 'hashedPassword',
        role: 'admin' as const,
        tenantId: 'tenant-1',
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TenantService,
                {
                    provide: PrismaService,
                    useValue: {
                        $transaction: jest.fn(),
                        tenant: {
                            create: jest.fn(),
                            findMany: jest.fn(),
                            findUnique: jest.fn(),
                            findFirst: jest.fn(),
                            update: jest.fn(),
                            delete: jest.fn(),
                        },
                    },
                },
                {
                    provide: UserService,
                    useValue: {
                        create: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<TenantService>(TenantService);
        prismaService = module.get(PrismaService);
        userService = module.get(UserService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('create', () => {
        const createTenantDto: CreateTenantDto = {
            name: 'Test Tenant',
            marketplaceRequiresApproval: true,
            initialAdminUser: {
                email: 'admin@test.com',
                name: 'Admin User',
                password: 'password123',
            },
        };

        it('should create a tenant with admin user successfully', async () => {
            // Arrange
            (prismaService.tenant.findFirst as jest.Mock).mockResolvedValue(null); // No existing tenant
            (prismaService.$transaction as jest.Mock).mockImplementation(async (callback) => {
                return await callback({
                    tenant: { create: jest.fn().mockResolvedValue(mockTenant) },
                });
            });
            (userService.create as jest.Mock).mockResolvedValue(mockUser);

            // Act
            const result = await service.create(createTenantDto);

            // Assert
            expect(result).toEqual(mockTenant);
            expect(prismaService.tenant.findFirst).toHaveBeenCalledWith({
                where: { name: 'Test Tenant' },
                select: { id: true },
            });
            expect(prismaService.$transaction).toHaveBeenCalled();
            expect(userService.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    email: 'admin@test.com',
                    name: 'Admin User',
                    role: 'tenant_admin',
                }),
                'tenant-1'
            );
        });

        it('should throw ConflictException when tenant name already exists', async () => {
            // Arrange
            (prismaService.tenant.findFirst as jest.Mock).mockResolvedValue({ id: 'existing-tenant-id' });

            // Act & Assert
            await expect(service.create(createTenantDto)).rejects.toThrow(ConflictException);
            expect(prismaService.tenant.findFirst).toHaveBeenCalledWith({
                where: { name: 'Test Tenant' },
                select: { id: true },
            });
        });

        it('should throw ConflictException when Prisma unique constraint violation occurs', async () => {
            // Arrange
            (prismaService.tenant.findFirst as jest.Mock).mockResolvedValue(null);

            const duplicateError = new Prisma.PrismaClientKnownRequestError(
                'Unique constraint violation',
                {
                    code: 'P2002',
                    clientVersion: '5.0.0',
                }
            );

            (prismaService.$transaction as jest.Mock).mockRejectedValue(duplicateError);

            // Act & Assert
            await expect(service.create(createTenantDto)).rejects.toThrow(ConflictException);
        });
    });

    describe('findAll', () => {
        it('should return all tenants', async () => {
            // Arrange
            const mockTenants = [mockTenant];
            (prismaService.tenant.findMany as jest.Mock).mockResolvedValue(mockTenants);

            // Act
            const result = await service.findAll();

            // Assert
            expect(result).toEqual(mockTenants);
            expect(prismaService.tenant.findMany).toHaveBeenCalled();
        });
    });

    describe('findOne', () => {
        it('should return a tenant when found', async () => {
            // Arrange
            (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);

            // Act
            const result = await service.findOne('tenant-1');

            // Assert
            expect(result).toEqual(mockTenant);
            expect(prismaService.tenant.findUnique).toHaveBeenCalledWith({
                where: { id: 'tenant-1' },
            });
        });

        it('should throw NotFoundException when tenant not found', async () => {
            // Arrange
            (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(null);

            // Act & Assert
            await expect(service.findOne('non-existent-tenant')).rejects.toThrow(NotFoundException);
        });
    });

    describe('getMarketplaceRequiresApproval', () => {
        it('should return marketplace approval requirement', async () => {
            // Arrange
            (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);

            // Act
            const result = await service.getMarketplaceRequiresApproval('tenant-1');

            // Assert
            expect(result).toBe(true);
            expect(prismaService.tenant.findUnique).toHaveBeenCalledWith({
                where: { id: 'tenant-1' },
                select: { marketplaceRequiresApproval: true },
            });
        });

        it('should throw NotFoundException when tenant not found', async () => {
            // Arrange
            (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(null);

            // Act & Assert
            await expect(
                service.getMarketplaceRequiresApproval('non-existent-tenant')
            ).rejects.toThrow(NotFoundException);
        });
    });
}); 