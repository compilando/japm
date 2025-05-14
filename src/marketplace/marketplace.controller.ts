import { Controller, Get, Query, UseGuards, Request, ValidationPipe, UsePipes } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { MarketplaceService, MarketplaceQueryParams } from './marketplace.service';
import { PromptVersion, PromptAssetVersion } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

// DTO para validar y tipar los query params (opcional pero recomendado para robustez)
// Por ahora, usaremos MarketplaceQueryParams directamente, pero un DTO con class-validator sería mejor.
// import { MarketplaceQueryDto } from './dto/marketplace-query.dto';


@ApiTags('Marketplace')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('marketplace')
export class MarketplaceController {
    constructor(private readonly marketplaceService: MarketplaceService) { }

    @Get('prompts')
    @ApiOperation({ summary: 'Get published prompts from the marketplace for the current tenant' })
    @ApiQuery({ name: 'search', required: false, type: String, description: 'Search term for prompt name or description' })
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number for pagination' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
    @ApiQuery({ name: 'sortBy', required: false, enum: ['createdAt', 'name'], description: 'Sort by field' }) // 'popularity' requeriría más lógica
    @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], description: 'Sort order' })
    // TODO: ApiQuery para tags cuando se implemente el filtro
    @ApiResponse({ status: 200, description: 'List of published prompts.' /* type: [PromptVersionDto] */ })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    // @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true })) // Activar si se usa un DTO para queryParams
    async getPublishedPrompts(
        @Request() req: any,
        @Query() queryParams: MarketplaceQueryParams // Usar DTO validado aquí sería mejor
    ): Promise<PromptVersion[]> {
        const tenantId = req.user.tenantId;
        // Convertir page y limit a números si vienen como string del query
        if (queryParams.page) queryParams.page = Number(queryParams.page);
        if (queryParams.limit) queryParams.limit = Number(queryParams.limit);
        return this.marketplaceService.getPublishedPrompts(tenantId, queryParams);
    }

    @Get('assets')
    @ApiOperation({ summary: 'Get published assets from the marketplace for the current tenant' })
    @ApiQuery({ name: 'search', required: false, type: String, description: 'Search term for asset key' })
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number for pagination' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
    @ApiQuery({ name: 'sortBy', required: false, enum: ['createdAt', 'name'], description: 'Sort by field' })
    @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], description: 'Sort order' })
    // TODO: ApiQuery para category cuando se implemente el filtro
    @ApiResponse({ status: 200, description: 'List of published assets.' /* type: [PromptAssetVersionDto] */ })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    // @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
    async getPublishedAssets(
        @Request() req: any,
        @Query() queryParams: MarketplaceQueryParams
    ): Promise<PromptAssetVersion[]> {
        const tenantId = req.user.tenantId;
        if (queryParams.page) queryParams.page = Number(queryParams.page);
        if (queryParams.limit) queryParams.limit = Number(queryParams.limit);
        return this.marketplaceService.getPublishedAssets(tenantId, queryParams);
    }
} 