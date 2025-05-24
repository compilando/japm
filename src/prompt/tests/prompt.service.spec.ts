import { Test, TestingModule } from '@nestjs/testing';
import { PromptService } from '../prompt.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantService } from '../../tenant/tenant.service';
import { TagService } from '../../tag/tag.service';
import { EnvironmentService } from '../../environment/environment.service';
import { ProjectService } from '../../project/project.service';
import { SystemPromptService } from '../../system-prompt/system-prompt.service';
import { RawExecutionService } from '../../raw-execution/raw-execution.service';
import { AuditLoggerService } from '../../common/services/audit-logger.service';
import { CreatePromptDto } from '../dto/create-prompt.dto';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

describe('PromptService', () => {
    let service: PromptService;
    let prismaService: jest.Mocked<PrismaService>;
    let auditLogger: jest.Mocked<AuditLoggerService>;

    // Mock data
    const mockTenant = {
        id: 'tenant-1',
        name: 'Test Tenant',
        marketplaceRequiresApproval: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const mockProject = {
        id: 'project-1',
        name: 'Test Project',
        tenantId: 'tenant-1',
        ownerUserId: 'user-1',
        description: 'Test Description',
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const mockTag = {
        id: 'tag-1',
        name: 'test-tag',
        projectId: 'project-1',
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const mockPrompt = {
        id: 'test-prompt',
        name: 'Test Prompt',
        description: 'Test Description',
        type: 'SYSTEM' as const,
        projectId: 'project-1',
        tenantId: 'tenant-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: [mockTag],
        versions: [
            {
                id: 'version-1',
                promptId: 'test-prompt',
                promptText: 'Hello {{name}}',
                versionTag: '1.0.0',
                languageCode: 'en-US',
                changeMessage: 'Initial version',
                status: 'draft' as const,
                createdAt: new Date(),
                updatedAt: new Date(),
                aiModelId: null,
                marketplaceStatus: 'NOT_PUBLISHED' as const,
                marketplacePublishedAt: null,
                marketplaceRequestedAt: null,
                marketplaceApprovedAt: null,
                marketplaceRejectionReason: null,
                marketplaceRequesterId: null,
                marketplaceApproverId: null,
                translations: [],
                activeInEnvironments: [],
            },
        ],
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PromptService,
                {
                    provide: PrismaService,
                    useValue: {
                        $transaction: jest.fn(),
                        project: {
                            findUnique: jest.fn(),
                        },
                        tenant: {
                            findUnique: jest.fn(),
                        },
                        tag: {
                            findMany: jest.fn(),
                        },
                        prompt: {
                            create: jest.fn(),
                            findMany: jest.fn(),
                            findUnique: jest.fn(),
                            findUniqueOrThrow: jest.fn(),
                            update: jest.fn(),
                            delete: jest.fn(),
                        },
                        promptVersion: {
                            create: jest.fn(),
                        },
                    },
                },
                {
                    provide: TenantService,
                    useValue: {
                        findOne: jest.fn(),
                    },
                },
                {
                    provide: TagService,
                    useValue: {
                        findByNames: jest.fn(),
                    },
                },
                {
                    provide: EnvironmentService,
                    useValue: {
                        findByProject: jest.fn(),
                    },
                },
                {
                    provide: ProjectService,
                    useValue: {
                        findOne: jest.fn(),
                    },
                },
                {
                    provide: SystemPromptService,
                    useValue: {
                        findDefault: jest.fn(),
                    },
                },
                {
                    provide: RawExecutionService,
                    useValue: {
                        execute: jest.fn(),
                    },
                },
                {
                    provide: AuditLoggerService,
                    useValue: {
                        logCreation: jest.fn(),
                        logUpdate: jest.fn(),
                        logDeletion: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<PromptService>(PromptService);
        prismaService = module.get(PrismaService);
        auditLogger = module.get(AuditLoggerService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('create', () => {
        const createPromptDto: CreatePromptDto = {
            name: 'Test Prompt',
            description: 'Test Description',
            promptText: 'Hello {{name}}',
            languageCode: 'en-US',
            type: 'SYSTEM',
            tags: ['test-tag'],
        };

        it('should create a prompt successfully', async () => {
            // Arrange
            (prismaService.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
            (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);
            (prismaService.tag.findMany as jest.Mock).mockResolvedValue([mockTag]);

            const transactionCallback = jest.fn().mockImplementation(async (callback) => {
                return await callback({
                    prompt: { create: jest.fn().mockResolvedValue(mockPrompt) },
                    promptVersion: { create: jest.fn().mockResolvedValue(mockPrompt.versions[0]) },
                });
            });

            (prismaService.$transaction as jest.Mock).mockImplementation(transactionCallback);
            (prismaService.prompt.findUniqueOrThrow as jest.Mock).mockResolvedValue(mockPrompt);

            // Act
            const result = await service.create(createPromptDto, 'project-1', 'tenant-1');

            // Assert
            expect(result).toEqual(mockPrompt);
            expect(prismaService.project.findUnique).toHaveBeenCalledWith({
                where: { id: 'project-1' },
            });
            expect(prismaService.tenant.findUnique).toHaveBeenCalledWith({
                where: { id: 'tenant-1' },
            });
            expect(prismaService.tag.findMany).toHaveBeenCalledWith({
                where: { name: { in: ['test-tag'] }, projectId: 'project-1' },
                select: { id: true, name: true },
            });
            expect(prismaService.$transaction).toHaveBeenCalled();
        });

        it('should throw NotFoundException when project does not exist', async () => {
            // Arrange
            (prismaService.project.findUnique as jest.Mock).mockResolvedValue(null);

            // Act & Assert
            await expect(
                service.create(createPromptDto, 'non-existent-project', 'tenant-1')
            ).rejects.toThrow(NotFoundException);

            expect(prismaService.project.findUnique).toHaveBeenCalledWith({
                where: { id: 'non-existent-project' },
            });
        });

        it('should throw NotFoundException when tenant does not exist', async () => {
            // Arrange
            (prismaService.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
            (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(null);

            // Act & Assert
            await expect(
                service.create(createPromptDto, 'project-1', 'non-existent-tenant')
            ).rejects.toThrow(NotFoundException);
        });

        it('should throw NotFoundException when tags do not exist', async () => {
            // Arrange
            (prismaService.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
            (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);
            (prismaService.tag.findMany as jest.Mock).mockResolvedValue([]); // No tags found

            // Act & Assert
            await expect(
                service.create(createPromptDto, 'project-1', 'tenant-1')
            ).rejects.toThrow(NotFoundException);
        });

        it('should throw ConflictException when prompt slug already exists', async () => {
            // Arrange
            (prismaService.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
            (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);
            (prismaService.tag.findMany as jest.Mock).mockResolvedValue([mockTag]);

            const duplicateError = new Prisma.PrismaClientKnownRequestError(
                'Unique constraint violation',
                {
                    code: 'P2002',
                    clientVersion: '5.0.0',
                }
            );

            (prismaService.$transaction as jest.Mock).mockRejectedValue(duplicateError);

            // Act & Assert
            await expect(
                service.create(createPromptDto, 'project-1', 'tenant-1')
            ).rejects.toThrow(ConflictException);
        });
    });

    describe('findAll', () => {
        it('should return all prompts for a project', async () => {
            // Arrange
            const mockPrompts = [mockPrompt];
            (prismaService.prompt.findMany as jest.Mock).mockResolvedValue(mockPrompts);

            // Act
            const result = await service.findAll('project-1');

            // Assert
            expect(result).toEqual(mockPrompts);
            expect(prismaService.prompt.findMany).toHaveBeenCalledWith({
                where: { projectId: 'project-1' },
                include: {
                    tags: { select: { name: true } },
                    versions: {
                        select: { id: true, versionTag: true },
                        orderBy: { createdAt: 'desc' },
                    },
                },
            });
        });

        it('should return empty array when no prompts exist', async () => {
            // Arrange
            (prismaService.prompt.findMany as jest.Mock).mockResolvedValue([]);

            // Act
            const result = await service.findAll('project-1');

            // Assert
            expect(result).toEqual([]);
        });
    });

    describe('findOne', () => {
        it('should return a prompt when found', async () => {
            // Arrange
            (prismaService.prompt.findUnique as jest.Mock).mockResolvedValue(mockPrompt);

            // Act
            const result = await service.findOne('test-prompt', 'project-1');

            // Assert
            expect(result).toEqual(mockPrompt);
            expect(prismaService.prompt.findUnique).toHaveBeenCalledWith({
                where: {
                    prompt_id_project_unique: {
                        id: 'test-prompt',
                        projectId: 'project-1',
                    },
                },
                include: expect.any(Object),
            });
        });

        it('should throw NotFoundException when prompt not found', async () => {
            // Arrange
            (prismaService.prompt.findUnique as jest.Mock).mockResolvedValue(null);

            // Act & Assert
            await expect(
                service.findOne('non-existent-prompt', 'project-1')
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('remove', () => {
        it('should delete a prompt successfully', async () => {
            // Arrange
            (prismaService.prompt.findUnique as jest.Mock).mockResolvedValue(mockPrompt);
            (prismaService.prompt.delete as jest.Mock).mockResolvedValue(mockPrompt);

            // Act
            await service.remove('test-prompt', 'project-1', 'user-1', 'tenant-1');

            // Assert
            expect(prismaService.prompt.delete).toHaveBeenCalledWith({
                where: {
                    prompt_id_project_unique: {
                        id: 'test-prompt',
                        projectId: 'project-1',
                    },
                },
            });
            expect(auditLogger.logDeletion).toHaveBeenCalled();
        });
    });

    describe('error handling', () => {
        it('should handle database connection errors gracefully', async () => {
            // Arrange
            const dbError = new Error('Database connection failed');
            (prismaService.project.findUnique as jest.Mock).mockRejectedValue(dbError);

            const validDto: CreatePromptDto = {
                name: 'Test Prompt',
                description: 'Test Description',
                promptText: 'Hello {{name}}',
                languageCode: 'en-US',
                type: 'SYSTEM',
            };

            // Act & Assert
            await expect(
                service.create(validDto, 'project-1', 'tenant-1')
            ).rejects.toThrow('Database connection failed');
        });
    });
}); 