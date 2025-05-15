import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UsePipes,
  ValidationPipe,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { SystemPromptService } from './system-prompt.service';
import { CreateSystemPromptDto, UpdateSystemPromptDto } from './dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Assuming general auth needed
// import { AdminGuard } from '../auth/guards/admin.guard'; // Import if you have an AdminGuard

@ApiTags('System Prompts')
@ApiBearerAuth() // Indicate that endpoints generally require Bearer token
@Controller('system-prompts') // Base path for system prompts
export class SystemPromptController {
  private readonly logger = new Logger(SystemPromptController.name);

  constructor(private readonly service: SystemPromptService) {}

  // --- Create --- //
  @Post()
  @UseGuards(JwtAuthGuard) // TODO: Replace/add AdminGuard for production
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @ApiOperation({
    summary: 'Create a new system prompt (Admin Only - conceptually)',
  })
  @ApiBody({ type: CreateSystemPromptDto })
  @ApiResponse({
    status: 201,
    description: 'System prompt created successfully.',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  @ApiResponse({ status: 404, description: 'Conflict: Name already exists.' }) // Note: Service returns 404, maybe change to 409?
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createDto: CreateSystemPromptDto) {
    this.logger.debug(
      `[create] Received POST request. Body: ${JSON.stringify(createDto, null, 2)}`,
    );
    return this.service.create(createDto);
  }

  // --- Read All --- //
  @Get()
  @UseGuards(JwtAuthGuard) // All authenticated users can read?
  @ApiOperation({ summary: 'Get all system prompts' })
  @ApiResponse({ status: 200, description: 'List of system prompts.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  findAll() {
    return this.service.findAll();
  }

  // --- Read One --- //
  @Get(':name')
  @UseGuards(JwtAuthGuard) // All authenticated users can read?
  @ApiOperation({ summary: 'Get a specific system prompt by name' })
  @ApiParam({
    name: 'name',
    description: 'Unique name of the system prompt',
    type: String,
  })
  @ApiResponse({ status: 200, description: 'System prompt details.' })
  @ApiResponse({ status: 404, description: 'System prompt not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  findOne(@Param('name') name: string) {
    return this.service.findOneByName(name);
  }

  // --- Update --- //
  @Patch(':name')
  @UseGuards(JwtAuthGuard) // TODO: Replace/add AdminGuard for production
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @ApiOperation({
    summary: 'Update an existing system prompt (Admin Only - conceptually)',
  })
  @ApiParam({
    name: 'name',
    description: 'Unique name of the system prompt to update',
    type: String,
  })
  @ApiBody({ type: UpdateSystemPromptDto })
  @ApiResponse({
    status: 200,
    description: 'System prompt updated successfully.',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  @ApiResponse({
    status: 404,
    description: 'System prompt not found or conflict with new name.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  update(
    @Param('name') name: string,
    @Body() updateDto: UpdateSystemPromptDto,
  ) {
    this.logger.debug(
      `[update] Received PATCH for name: ${name}. Body: ${JSON.stringify(updateDto, null, 2)}`,
    );
    return this.service.update(name, updateDto);
  }

  // --- Delete --- //
  @Delete(':name')
  @UseGuards(JwtAuthGuard) // TODO: Replace/add AdminGuard for production
  @ApiOperation({
    summary: 'Delete a system prompt (Admin Only - conceptually)',
  })
  @ApiParam({
    name: 'name',
    description: 'Unique name of the system prompt to delete',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'System prompt deleted successfully.',
  })
  @ApiResponse({ status: 404, description: 'System prompt not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @HttpCode(HttpStatus.OK) // Or 204 No Content?
  remove(@Param('name') name: string) {
    return this.service.remove(name);
  }
}
