import { Controller, Get, Post, Body, Patch, Param, Delete, UsePipes, ValidationPipe } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { User } from '@prisma/client'; // Import User type from Prisma
import { Logger } from '@nestjs/common'; // Import Logger

@ApiTags('Users') // Tag for grouping in Swagger
@Controller('api/users') // Base path for this controller
export class UserController {
    private readonly logger = new Logger(UserController.name); // Add Logger instance

    constructor(private readonly userService: UserService) { }

    @Post()
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })) // Enable validation
    @ApiOperation({ summary: 'Create a new user' })
    @ApiBody({ type: CreateUserDto })
    @ApiResponse({ status: 201, description: 'User created successfully.', type: CreateUserDto }) // Or a User DTO without password if preferred
    @ApiResponse({ status: 400, description: 'Invalid input data.' })
    create(@Body() createUserDto: CreateUserDto): Promise<User> {
        this.logger.debug(`[create] Received POST request. Body: ${JSON.stringify(createUserDto, null, 2)}`); // Log the received DTO (Consider masking password)
        // Note: Returning the created user might expose the password hash.
        // Consider returning a specific DTO or just a success message.
        return this.userService.create(createUserDto);
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
