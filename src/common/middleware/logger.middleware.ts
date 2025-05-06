import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
    // private logger = new Logger('HTTP'); // Contexto 'HTTP' para los logs
    private logger = new Logger('HTTP'); // 'HTTP' context for logs

    use(request: Request, response: Response, next: NextFunction): void {
        const { method, originalUrl, body } = request;
        const userAgent = request.get('user-agent') || '';

        // Log upon receiving the request
        let requestLog = `Request... ${method} ${originalUrl} - ${userAgent}`;

        // Add body to log only for POST, PUT, PATCH
        if (['POST', 'PUT', 'PATCH'].includes(method) && body) {
            // Convert to JSON, handle potentially sensitive content or size if necessary
            // Here we simply convert it to a string.
            // Consider truncating or sanitizing large/sensitive bodies in production.
            requestLog += ` - Body: ${JSON.stringify(body)}`;
        }

        this.logger.log(requestLog);

        // Log upon response completion
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