import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
    private logger = new Logger('HTTP'); // Contexto 'HTTP' para los logs

    use(request: Request, response: Response, next: NextFunction): void {
        const { method, originalUrl, body } = request;
        const userAgent = request.get('user-agent') || '';

        // Loguear al recibir la solicitud
        let requestLog = `Request... ${method} ${originalUrl} - ${userAgent}`;

        // Añadir body al log solo para POST, PUT, PATCH
        if (['POST', 'PUT', 'PATCH'].includes(method) && body) {
            // Convertir a JSON, manejar posible contenido sensible o tamaño si es necesario
            // Aquí simplemente lo convertimos a string.
            // Considera truncar o sanitizar bodies grandes/sensibles en producción.
            requestLog += ` - Body: ${JSON.stringify(body)}`;
        }

        this.logger.log(requestLog);

        // Loguear al finalizar la respuesta
        response.on('finish', () => {
            const { statusCode } = response;
            const contentLength = response.get('content-length');

            this.logger.log(
                `Response: ${method} ${originalUrl} ${statusCode} ${contentLength || '-'} - ${userAgent}`,
            );
        });

        next();
    }
} 