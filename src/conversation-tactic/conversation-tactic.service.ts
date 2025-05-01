import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateConversationTacticDto } from './dto/create-conversation-tactic.dto';
import { UpdateConversationTacticDto } from './dto/update-conversation-tactic.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, ConversationTactic } from '@prisma/client';

@Injectable()
export class ConversationTacticService {
    constructor(private prisma: PrismaService) { }

    create(createDto: CreateConversationTacticDto): Promise<ConversationTactic> {
        const { regionId, culturalDataId, ...restData } = createDto;
        let data: Prisma.ConversationTacticCreateInput = { ...restData };

        if (regionId) {
            data.region = { connect: { languageCode: regionId } };
        }
        if (culturalDataId) {
            data.culturalData = { connect: { id: culturalDataId } };
        }

        return this.prisma.conversationTactic.create({
            data,
            include: { region: true, culturalData: true },
        });
    }

    findAll(): Promise<ConversationTactic[]> {
        return this.prisma.conversationTactic.findMany({
            include: { region: true, culturalData: true, prompts: false }, // Excluir prompts por defecto?
        });
    }

    async findOne(name: string): Promise<ConversationTactic> {
        const tactic = await this.prisma.conversationTactic.findUnique({
            where: { name },
            include: { region: true, culturalData: true, prompts: true }, // Incluir todo aquí?
        });
        if (!tactic) {
            throw new NotFoundException(`ConversationTactic with NAME "${name}" not found`);
        }
        return tactic;
    }

    async update(name: string, updateDto: UpdateConversationTacticDto): Promise<ConversationTactic> {
        const { regionId, culturalDataId, ...restData } = updateDto;
        let data: Prisma.ConversationTacticUpdateInput = { ...restData };

        if (regionId !== undefined) {
            data.region = regionId ? { connect: { languageCode: regionId } } : { disconnect: true };
        }
        if (culturalDataId !== undefined) {
            data.culturalData = culturalDataId ? { connect: { id: culturalDataId } } : { disconnect: true };
        }

        try {
            return await this.prisma.conversationTactic.update({
                where: { name },
                data,
                include: { region: true, culturalData: true },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException(`ConversationTactic with NAME "${name}" not found, or related entity could not be connected/found`);
            }
            throw error;
        }
    }

    async remove(name: string): Promise<ConversationTactic> {
        try {
            return await this.prisma.conversationTactic.delete({
                where: { name },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new NotFoundException(`ConversationTactic with NAME "${name}" not found`);
            }
            // Considerar error P2003 si hay Prompts asociados
            throw error;
        }
    }
}
