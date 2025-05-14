import { Controller, Get, Post, Body, Patch, Param, Delete, UsePipes, ValidationPipe, UseGuards, Request, UnauthorizedException } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { User } from '@prisma/client'; // Import User type from Prisma
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Importar JwtAuthGuard
import { Logger } from '@nestjs/common'; // Import Logger

@ApiTags('Users') // Tag for grouping in Swagger
@Controller('users') // Base path for this controller
export class UserController {
    private readonly logger = new Logger(UserController.name); // Add Logger instance

    constructor(private readonly userService: UserService) { }

    @Post()
    @UseGuards(JwtAuthGuard) // <-- Añadir Guardia
    @ApiBearerAuth()       // <-- Añadir anotación Swagger
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })) // Enable validation
    @ApiOperation({ summary: 'Create a new user (within the authenticated admin user\'s tenant)' })
    @ApiBody({ type: CreateUserDto })
    @ApiResponse({ status: 201, description: 'User created successfully.' /* type: UserDto */ })
    @ApiResponse({ status: 400, description: 'Invalid input data.' })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    create(@Request() req, @Body() createUserDto: CreateUserDto): Promise<User> {
        this.logger.debug(`[create] Received POST request. Body: ${JSON.stringify(createUserDto, null, 2)}`); // Log the received DTO (Consider masking password)
        const tenantId = req.user?.tenantId; // <-- Obtener tenantId del admin
        if (!tenantId) {
            this.logger.error('Tenant ID not found in authenticated admin user request for user creation');
            throw new UnauthorizedException('Admin user tenant information is missing');
        }
        // TODO: Add role check? Ensure req.user is actually an admin?
        return this.userService.create(createUserDto, tenantId); // <-- Pasar tenantId al servicio
    }

    @Get()
    @ApiOperation({ summary: 'Get all users' })
    @ApiResponse({ status: 200, description: 'List of users.', type: [CreateUserDto] }) // Adjust type if needed
    findAll(): Promise<User[]> {
        return this.userService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a user by ID' })
    @ApiParam({ name: 'id', description: 'User ID', type: String })
    @ApiResponse({ status: 200, description: 'User found.', type: CreateUserDto })
    @ApiResponse({ status: 404, description: 'User not found.' })
    findOne(@Param('id') id: string): Promise<User> {
        return this.userService.findOneById(id);
    }

    @Patch(':id')
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, skipMissingProperties: true })) // Validate only present fields
    @ApiOperation({ summary: 'Update a user by ID' })
    @ApiParam({ name: 'id', description: 'ID of the user to update', type: String })
    @ApiBody({ type: UpdateUserDto })
    @ApiResponse({ status: 200, description: 'User updated successfully.', type: CreateUserDto })
    @ApiResponse({ status: 404, description: 'User not found.' })
    @ApiResponse({ status: 400, description: 'Invalid input data.' })
    update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto): Promise<User> {
        this.logger.debug(`[update] Received PATCH for userId: ${id}. Body: ${JSON.stringify(updateUserDto, null, 2)}`); // Log the received DTO (Consider masking password if present)
        return this.userService.update(id, updateUserDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a user by ID' })
    @ApiParam({ name: 'id', description: 'ID of the user to delete', type: String })
    @ApiResponse({ status: 200, description: 'User deleted successfully.' }) // Can return the deleted user if desired
    @ApiResponse({ status: 404, description: 'User not found.' })
    remove(@Param('id') id: string): Promise<User> {
        return this.userService.remove(id);
    }
}
