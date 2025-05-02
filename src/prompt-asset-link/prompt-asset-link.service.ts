import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CreatePromptAssetLinkDto } from './dto/create-prompt-asset-link.dto';
import { UpdatePromptAssetLinkDto } from './dto/update-prompt-asset-link.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, PromptAssetLink } from '@prisma/client';

@Injectable()
export class PromptAssetLinkService {
    constructor(private prisma: PrismaService) { }

    // Helper function to verify prompt version belongs to project
    private async verifyPromptVersionAccess(projectId: string, promptVersionId: string): Promise<void> {
        const promptVersion = await this.prisma.promptVersion.findUnique({
            where: { id: promptVersionId },
            select: { prompt: { select: { projectId: true } } },
        });
        if (!promptVersion) {
            throw new NotFoundException(`PromptVersion with ID "${promptVersionId}" not found`);
        }
        if (promptVersion.prompt.projectId !== projectId) {
            throw new ForbiddenException(`Access denied to PromptVersion "${promptVersionId}" for project "${projectId}"`);
        }
    }

    // Helper function to verify asset version belongs to project
    private async verifyAssetVersionAccess(projectId: string, assetVersionId: string): Promise<void> {
        const assetVersion = await this.prisma.promptAssetVersion.findUnique({
            where: { id: assetVersionId },
            select: { asset: { select: { projectId: true } } },
        });
        if (!assetVersion) {
            throw new NotFoundException(`AssetVersion with ID "${assetVersionId}" not found`);
        }
        if (assetVersion.asset.projectId !== projectId) {
            throw new ForbiddenException(`AssetVersion "${assetVersionId}" does not belong to project "${projectId}"`);
        }
    }

    async create(projectId: string, promptVersionId: string, createDto: CreatePromptAssetLinkDto): Promise<PromptAssetLink> {
        // Excluir promptVersionId y assetVersionId del DTO si están presentes
        const { promptVersionId: _p, assetVersionId, ...linkData } = createDto;

        // Validate both versions belong to the project
        await this.verifyPromptVersionAccess(projectId, promptVersionId);
        // Validar el assetVersionId que viene del DTO
        if (!assetVersionId) { throw new ForbiddenException('assetVersionId is required in the request body.'); }
        await this.verifyAssetVersionAccess(projectId, assetVersionId);

        try {
            return await this.prisma.promptAssetLink.create({
                data: {
                    ...linkData, // Contiene position, usageContext, etc.
                    promptVersion: { connect: { id: promptVersionId } },
                    assetVersion: { connect: { id: assetVersionId } }, // Usa el assetVersionId del DTO
                },
            });
        } catch (error) {
            // Handle potential unique constraint errors if needed
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                // e.g., unique constraint on (promptVersionId, assetVersionId)?
                throw new ForbiddenException('This asset version is already linked to this prompt version.');
            }
            // P2025 should be caught by prior validation, but kept as fallback
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException('Error connecting PromptVersion or AssetVersion.');
            }
            throw error;
        }
    }

    async findAll(projectId: string, promptVersionId: string): Promise<PromptAssetLink[]> {
        // First verify access to the prompt version itself
        await this.verifyPromptVersionAccess(projectId, promptVersionId);

        // Then find links for that specific prompt version
        return this.prisma.promptAssetLink.findMany({
            where: { promptVersionId: promptVersionId },
            include: { assetVersion: { include: { asset: true } } }, // Include related data as needed
        });
    }

    async findOne(projectId: string, promptVersionId: string, linkId: string): Promise<PromptAssetLink> {
        // Verify access to the parent prompt version first
        await this.verifyPromptVersionAccess(projectId, promptVersionId);

        const link = await this.prisma.promptAssetLink.findUnique({
            where: {
                id: linkId,
                // Ensure the link belongs to the specified prompt version
                promptVersionId: promptVersionId
            },
            include: {
                promptVersion: { include: { prompt: true } },
                assetVersion: { include: { asset: true } }
            },
        });

        if (!link) {
            throw new NotFoundException(`PromptAssetLink with ID "${linkId}" not found for PromptVersion "${promptVersionId}"`);
        }
        // Double check project ID match (belt and suspenders)
        if (link.promptVersion.prompt.projectId !== projectId) {
            throw new ForbiddenException(`Link ${linkId} does not belong to project ${projectId}`);
        }
        return link;
    }

    async update(projectId: string, promptVersionId: string, linkId: string, updateDto: UpdatePromptAssetLinkDto): Promise<PromptAssetLink> {
        // Verify access and existence before attempting update
        await this.findOne(projectId, promptVersionId, linkId); // Reuses validation logic

        try {
            // Usar el DTO directamente, asumiendo que solo contiene campos actualizables del link
            return await this.prisma.promptAssetLink.update({
                where: { id: linkId },
                data: updateDto,
            });
        } catch (error) {
            // P2025 should be caught by findOne, but handle just in case
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException(`PromptAssetLink with ID "${linkId}" not found for update.`);
            }
            throw error;
        }
    }

    async remove(projectId: string, promptVersionId: string, linkId: string): Promise<PromptAssetLink> {
        // Verify access and existence before attempting delete
        await this.findOne(projectId, promptVersionId, linkId); // Reuses validation logic

        try {
            return await this.prisma.promptAssetLink.delete({
                where: { id: linkId },
            });
        } catch (error) {
            // P2025 should be caught by findOne
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException(`PromptAssetLink with ID "${linkId}" not found`);
            }
            throw error;
        }
    }
}
