import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { Asset } from '@prisma/client';

@Injectable()
export class AssetService {
    constructor(private readonly prisma: PrismaService) { }

    async create(createAssetDto: CreateAssetDto, tenantId: string): Promise<Asset> {
        return this.prisma.asset.create({
            data: {
                ...createAssetDto,
                tenantId,
            },
        });
    }

    async findAll(tenantId: string): Promise<Asset[]> {
        return this.prisma.asset.findMany({
            where: { tenantId },
        });
    }

    async findOne(id: string, tenantId: string): Promise<Asset> {
        const asset = await this.prisma.asset.findFirst({
            where: { id, tenantId },
        });

        if (!asset) {
            throw new NotFoundException(`Asset with ID ${id} not found`);
        }

        return asset;
    }

    async update(id: string, updateAssetDto: UpdateAssetDto, tenantId: string): Promise<Asset> {
        await this.findOne(id, tenantId);

        return this.prisma.asset.update({
            where: { id },
            data: updateAssetDto,
        });
    }

    async remove(id: string, tenantId: string): Promise<void> {
        const asset = await this.findOne(id, tenantId);
        await this.prisma.asset.delete({
            where: { id: asset.id },
        });
    }
} 