import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
    // private logger = new Logger('HTTP'); // Contexto 'HTTP' para los logs
    private logger = new Logger('HTTP'); // 'HTTP' context for logs

    use(request: Request, response: Response, next: NextFunction): void {
        const { ip, method, originalUrl: url } = request;
        const userAgent = request.get('user-agent') || '';
        const contentLength = request.get('content-length');
        const requestBody = JSON.stringify(request.body); // Log the body

        this.logger.log(
            `REQ >>> ${method} ${url} - ${userAgent} ${ip} - ContentLength: ${contentLength} - Body: ${requestBody}`
        );

        // Log upon response completion
        response.on('finish', () => {
            const { statusCode } = response;
            const contentLength = response.get('content-length');
            this.logger.log(
                `RES <<< ${method} ${url} ${statusCode} ${contentLength} - ${userAgent} ${ip}`
            );
        });

        next();
    }
} 