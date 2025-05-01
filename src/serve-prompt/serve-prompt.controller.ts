import { Controller, Get, Query, UsePipes, ValidationPipe, BadRequestException } from '@nestjs/common';
import { ServePromptService } from './serve-prompt.service';
import { ServePromptQueryDto } from './dto/serve-prompt-query.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

// Definir un DTO de respuesta si queremos estructurar la salida
// Por ahora, devolveremos el objeto directamente del servicio

@ApiTags('Serve Prompt')
@Controller('serve-prompt')
export class ServePromptController {
    constructor(private readonly service: ServePromptService) { }

    @Get()
    @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true })) // transform: true para convertir tipos (ej. boolean)
    @ApiOperation({ summary: 'Obtiene y ensambla un prompt basado en criterios' })
    @ApiResponse({ status: 200, description: 'Prompt procesado y metadatos.', schema: { example: { processedPrompt: "string", metadata: {} } } })
    @ApiResponse({ status: 404, description: 'Prompt o versión no encontrada.' })
    @ApiResponse({ status: 400, description: 'Parámetros de consulta inválidos.' })
    async servePrompt(@Query() query: ServePromptQueryDto): Promise<{ processedPrompt: string; metadata: any }> {
        // Asegurarse de que promptId se proporciona (o manejar lógica de tacticId si se mantiene)
        if (!query.promptId) {
            // TODO: Implementar lógica para buscar por tacticId si se decide mantener esa opción,
            // o lanzar BadRequestException si promptId es estrictamente necesario.
            throw new BadRequestException('promptId is required.');
        }
        // Proveer un idioma por defecto si no se especifica en la query
        const languageCode = query.languageCode || 'en'; // Usar 'en' como default temporal

        // Llamar al método refactorizado del servicio con parámetros individuales
        return this.service.servePrompt(
            query.promptId,
            languageCode,
            query.versionTag,
            undefined // Context no está disponible en el DTO actual
        );
    }
}
