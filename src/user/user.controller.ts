import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UsePipes,
  ValidationPipe,
  UseGuards,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { User } from '@prisma/client'; // Import User type from Prisma
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Importar JwtAuthGuard
import { Logger } from '@nestjs/common'; // Import Logger

@ApiTags('Users')
@Controller('users')
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) { }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @ApiOperation({
    summary: 'Create new user',
    description: 'Creates a new user within the authenticated admin\'s tenant. Requires admin privileges.'
  })
  @ApiBody({
    type: CreateUserDto,
    description: 'User data to create'
  })
  @ApiResponse({
    status: 201,
    description: 'User successfully created',
    type: CreateUserDto
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data - Check the request body format'
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or expired token'
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required'
  })
  create(@Request() req, @Body() createUserDto: CreateUserDto): Promise<User> {
    this.logger.debug(
      `[create] Received POST request. Body: ${JSON.stringify(createUserDto, null, 2)}`,
    ); // Log the received DTO (Consider masking password)
    const tenantId = req.user?.tenantId; // <-- Obtener tenantId del admin
    if (!tenantId) {
      this.logger.error(
        'Tenant ID not found in authenticated admin user request for user creation',
      );
      throw new UnauthorizedException(
        'Admin user tenant information is missing',
      );
    }
    // TODO: Add role check? Ensure req.user is actually an admin?
    return this.userService.create(createUserDto, tenantId); // <-- Pasar tenantId al servicio
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all users',
    description: 'Retrieves a list of all users in the system. Requires admin privileges.'
  })
  @ApiResponse({
    status: 200,
    description: 'List of users retrieved successfully',
    type: [CreateUserDto]
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or expired token'
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required'
  })
  findAll(): Promise<User[]> {
    return this.userService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get user by ID',
    description: 'Retrieves a specific user by their unique ID. Requires admin privileges.'
  })
  @ApiParam({
    name: 'id',
    description: 'Unique user identifier (CUID)',
    type: String,
    required: true
  })
  @ApiResponse({
    status: 200,
    description: 'User found successfully',
    type: CreateUserDto
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or expired token'
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required'
  })
  @ApiResponse({
    status: 404,
    description: 'User not found - The specified ID does not exist'
  })
  findOne(@Param('id') id: string): Promise<User> {
    return this.userService.findOneById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      skipMissingProperties: true,
    })
  )
  @ApiOperation({
    summary: 'Update user',
    description: 'Updates an existing user\'s information. Requires admin privileges.'
  })
  @ApiParam({
    name: 'id',
    description: 'Unique user identifier to update (CUID)',
    type: String,
    required: true
  })
  @ApiBody({
    type: UpdateUserDto,
    description: 'User data to update'
  })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    type: CreateUserDto
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data - Check the request body format'
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or expired token'
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required'
  })
  @ApiResponse({
    status: 404,
    description: 'User not found - The specified ID does not exist'
  })
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    this.logger.debug(
      `[update] Received PATCH for userId: ${id}. Body: ${JSON.stringify(updateUserDto, null, 2)}`,
    ); // Log the received DTO (Consider masking password if present)
    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete user',
    description: 'Permanently deletes a user from the system. Requires admin privileges.'
  })
  @ApiParam({
    name: 'id',
    description: 'Unique user identifier to delete (CUID)',
    type: String,
    required: true
  })
  @ApiResponse({
    status: 200,
    description: 'User deleted successfully',
    type: CreateUserDto
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or expired token'
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required'
  })
  @ApiResponse({
    status: 404,
    description: 'User not found - The specified ID does not exist'
  })
  remove(@Param('id') id: string): Promise<User> {
    return this.userService.remove(id);
  }
}
