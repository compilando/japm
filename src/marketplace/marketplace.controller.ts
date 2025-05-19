import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  ValidationPipe,
  UsePipes,
  Req,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import {
  MarketplaceService,
  MarketplaceQueryParams,
} from './marketplace.service';
import { PromptVersion, PromptAssetVersion } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetPublishedPromptsQueryDto, GetPublishedAssetsQueryDto } from './dto';
import { Request as ExpressRequest } from 'express';
import { Logger } from '@nestjs/common';

interface RequestWithUser extends ExpressRequest {
  user: {
    tenantId: string;
  };
}

// DTO para validar y tipar los query params (opcional pero recomendado para robustez)
// Por ahora, usaremos MarketplaceQueryParams directamente, pero un DTO con class-validator sería mejor.
// import { MarketplaceQueryDto } from './dto/marketplace-query.dto';

@ApiTags('Marketplace')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('marketplace')
export class MarketplaceController {
  private readonly logger = new Logger(MarketplaceController.name);

  constructor(private readonly marketplaceService: MarketplaceService) { }

  @Get('prompts')
  @ApiOperation({
    summary: 'Get published prompts',
    description: 'Retrieves a paginated list of published prompts for the current tenant. Results can be filtered, sorted and searched.'
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search term to filter prompts by name or description'
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination (starts at 1)',
    example: 1
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page',
    example: 10
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
    description: 'Field to sort by (e.g. name, createdAt)',
    example: 'createdAt'
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['ASC', 'DESC'],
    description: 'Sort order direction',
    example: 'DESC'
  })
  @ApiQuery({
    name: 'languageCode',
    required: false,
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of published prompts retrieved successfully'
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Invalid or expired token'
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid query parameters - Check the provided values'
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado - Token inválido o expirado'
  })
  // @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true })) // Activar si se usa un DTO para queryParams
  async getPublishedPrompts(
    @Query() query: GetPublishedPromptsQueryDto,
    @Req() req: RequestWithUser,
  ): Promise<PromptVersion[]> {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new UnauthorizedException('User tenant information is missing');
    }
    if (query.page) query.page = Number(query.page);
    if (query.limit) query.limit = Number(query.limit);
    const params: MarketplaceQueryParams = {
      search: query.search,
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy as 'createdAt' | 'name' | 'popularity',
      sortOrder: query.sortOrder?.toLowerCase() as 'asc' | 'desc'
    };
    return this.marketplaceService.getPublishedPrompts(tenantId, params);
  }

  @Get('assets')
  @ApiOperation({
    summary: 'Get published assets',
    description: 'Retrieves a paginated list of published assets for the current tenant. Results can be filtered, sorted and searched.'
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search term to filter assets by name or description'
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination (starts at 1)',
    example: 1
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page',
    example: 10
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
    description: 'Field to sort by (e.g. name, createdAt)',
    example: 'createdAt'
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['ASC', 'DESC'],
    description: 'Sort order direction',
    example: 'DESC'
  })
  @ApiQuery({
    name: 'languageCode',
    required: false,
    type: String,
  })
  // TODO: ApiQuery para category cuando se implemente el filtro
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of published assets retrieved successfully'
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Invalid or expired token'
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid query parameters - Check the provided values'
  })
  // @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  async getPublishedAssets(
    @Query() query: GetPublishedAssetsQueryDto,
    @Req() req: RequestWithUser,
  ): Promise<PromptAssetVersion[]> {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new UnauthorizedException('User tenant information is missing');
    }
    if (query.page) query.page = Number(query.page);
    if (query.limit) query.limit = Number(query.limit);
    const params: MarketplaceQueryParams = {
      search: query.search,
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy as 'createdAt' | 'name' | 'popularity',
      sortOrder: query.sortOrder?.toLowerCase() as 'asc' | 'desc'
    };
    return this.marketplaceService.getPublishedAssets(tenantId, params);
  }
}
