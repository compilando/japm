import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
    constructor(private prisma: PrismaService) { }

    async create(createUserDto: CreateUserDto) {
        const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
        return this.prisma.user.create({
            data: {
                ...createUserDto,
                password: hashedPassword,
            },
        });
    }

    findAll() {
        return this.prisma.user.findMany();
    }

    async findOne(id: string) {
        const user = await this.prisma.user.findUnique({
            where: { id },
        });
        if (!user) {
            throw new NotFoundException(`User with ID "${id}" not found`);
        }
        return user;
    }

    async update(id: string, updateUserDto: UpdateUserDto) {
        if (updateUserDto.password) {
            updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
        }
        try {
            return await this.prisma.user.update({
                where: { id },
                data: updateUserDto,
            });
        } catch (error) {
            if (error.code === 'P2025') {
                throw new NotFoundException(`User with ID "${id}" not found`);
            }
            throw error;
        }
    }

    async remove(id: string) {
        try {
            return await this.prisma.user.delete({
                where: { id },
            });
        } catch (error) {
            if (error.code === 'P2025') {
                throw new NotFoundException(`User with ID "${id}" not found`);
            }
            throw error;
        }
    }
}
