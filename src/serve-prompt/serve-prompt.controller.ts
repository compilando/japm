import { Controller, Get, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { ServePromptService } from './serve-prompt.service';
import { ServePromptQueryDto } from './dto/serve-prompt-query.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

// Definir un DTO de respuesta si queremos estructurar la salida
// Por ahora, devolveremos el objeto directamente del servicio

@ApiTags('serve-prompt')
@Controller('serve-prompt')
export class ServePromptController {
    constructor(private readonly service: ServePromptService) { }

    @Get()
    @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true })) // transform: true para convertir tipos (ej. boolean)
    @ApiOperation({ summary: 'Obtiene y ensambla un prompt basado en criterios' })
    @ApiResponse({ status: 200, description: 'Prompt ensamblado listo para usar.', type: String })
    @ApiResponse({ status: 404, description: 'Prompt no encontrado.' })
    @ApiResponse({ status: 400, description: 'Parámetros de consulta inválidos.' })
    async servePrompt(@Query() query: ServePromptQueryDto): Promise<string> {
        // El DTO ya tiene valores por defecto y transformaciones
        return this.service.serve(query);
    }
}
