import { Injectable, NotFoundException } from '@nestjs/common';
import { CreatePromptAssetLinkDto } from './dto/create-prompt-asset-link.dto';
import { UpdatePromptAssetLinkDto } from './dto/update-prompt-asset-link.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, PromptAssetLink } from '@prisma/client';

@Injectable()
export class PromptAssetLinkService {
    constructor(private prisma: PrismaService) { }

    async create(createDto: CreatePromptAssetLinkDto): Promise<PromptAssetLink> {
        const { promptVersionId, assetVersionId, position, usageContext, insertionLogic, isRequired } = createDto;
        // TODO: Validar que promptVersionId y assetVersionId existen?
        try {
            return await this.prisma.promptAssetLink.create({
                data: {
                    position,
                    usageContext,
                    insertionLogic,
                    isRequired,
                    promptVersion: { connect: { id: promptVersionId } },
                    assetVersion: { connect: { id: assetVersionId } },
                },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException('PromptVersion or AssetVersion not found.');
            }
            throw error;
        }
    }

    findAll(): Promise<PromptAssetLink[]> {
        return this.prisma.promptAssetLink.findMany({
            include: { promptVersion: true, assetVersion: true },
        });
    }

    async findOne(id: string): Promise<PromptAssetLink> {
        const link = await this.prisma.promptAssetLink.findUnique({
            where: { id },
            include: {
                promptVersion: { include: { prompt: true } },
                assetVersion: { include: { asset: true } }
            },
        });
        if (!link) {
            throw new NotFoundException(`PromptAssetLink with ID "${id}" not found`);
        }
        return link;
    }

    async update(id: string, updateDto: UpdatePromptAssetLinkDto): Promise<PromptAssetLink> {
        // Solo actualiza campos propios del link (position, usageContext, etc.)
        try {
            return await this.prisma.promptAssetLink.update({
                where: { id },
                data: updateDto,
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException(`PromptAssetLink with ID "${id}" not found for update.`);
            }
            throw error;
        }
    }

    async remove(id: string): Promise<PromptAssetLink> {
        try {
            return await this.prisma.promptAssetLink.delete({
                where: { id },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException(`PromptAssetLink with ID "${id}" not found`);
            }
            throw error;
        }
    }
}
