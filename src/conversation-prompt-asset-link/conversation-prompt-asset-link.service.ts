import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateConversationPromptAssetLinkDto } from './dto/create-conversation-prompt-asset-link.dto';
import { UpdateConversationPromptAssetLinkDto } from './dto/update-conversation-prompt-asset-link.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, ConversationPromptAssetLink } from '@prisma/client';

@Injectable()
export class ConversationPromptAssetLinkService {
    constructor(private prisma: PrismaService) { }

    async create(createDto: CreateConversationPromptAssetLinkDto): Promise<ConversationPromptAssetLink> {
        const { promptVersionId, assetVersionId, ...restData } = createDto;

        try {
            return await this.prisma.conversationPromptAssetLink.create({
                data: {
                    ...restData,
                    promptVersion: { connect: { id: promptVersionId } },
                    assetVersion: { connect: { id: assetVersionId } },
                },
                include: { promptVersion: true, assetVersion: true },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                // El error P2025 aquí indica que promptVersionId o assetVersionId no existen
                throw new NotFoundException(`PromptVersion with ID "${promptVersionId}" or AssetVersion with ID "${assetVersionId}" not found.`);
            }
            throw error;
        }
    }

    findAll(): Promise<ConversationPromptAssetLink[]> {
        return this.prisma.conversationPromptAssetLink.findMany({
            include: { promptVersion: true, assetVersion: true }, // Incluir ambos lados de la relación
        });
    }

    async findOne(id: string): Promise<ConversationPromptAssetLink> {
        const link = await this.prisma.conversationPromptAssetLink.findUnique({
            where: { id },
            include: {
                promptVersion: { include: { prompt: true } }, // Incluir la versión y su prompt padre
                assetVersion: { include: { asset: true } }    // Incluir la versión y su asset padre
            },
        });
        if (!link) {
            throw new NotFoundException(`ConversationPromptAssetLink with ID "${id}" not found`);
        }
        return link;
    }

    async update(id: string, updateDto: UpdateConversationPromptAssetLinkDto): Promise<ConversationPromptAssetLink> {
        const { promptVersionId: _, assetVersionId: __, ...updatableData } = updateDto as any;

        try {
            return await this.prisma.conversationPromptAssetLink.update({
                where: { id },
                data: updatableData,
                include: { promptVersion: true, assetVersion: true },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException(`ConversationPromptAssetLink with ID "${id}" not found.`);
            }
            throw error;
        }
    }

    async remove(id: string): Promise<ConversationPromptAssetLink> {
        try {
            return await this.prisma.conversationPromptAssetLink.delete({
                where: { id },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException(`ConversationPromptAssetLink with ID "${id}" not found`);
            }
            throw error;
        }
    }
}
