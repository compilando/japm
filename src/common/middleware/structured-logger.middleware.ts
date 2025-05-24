import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { StructuredLoggerService, LogContext } from '../services/structured-logger.service';

interface RequestWithUser extends Request {
    user?: {
        userId?: string;
        tenantId?: string;
        id?: string;
    };
}

@Injectable()
export class StructuredLoggerMiddleware implements NestMiddleware {
    constructor(private structuredLogger: StructuredLoggerService) { }

    use(request: RequestWithUser, response: Response, next: NextFunction): void {
        const start = Date.now();
        const { ip, method, originalUrl: url } = request;
        const userAgent = request.get('user-agent') || '';

        // Extract user context if available
        const logContext: LogContext = {
            userId: request.user?.userId || request.user?.id || 'anonymous',
            tenantId: request.user?.tenantId || 'unknown',
            ip,
            userAgent,
            operation: `HTTP_${method}`,
        };

        response.on('finish', () => {
            const duration = Date.now() - start;
            const { statusCode } = response;
            const resContentLength = response.get('content-length');

            const message = `${method} ${url} - ${statusCode} - ${duration}ms`;

            // Prepare request metadata
            const requestMetadata = {
                method,
                url,
                headers: this.sanitizeHeaders(request.headers),
                query: request.query,
            };

            // Include body for POST/PUT/PATCH (but sanitize sensitive data)
            if (['POST', 'PUT', 'PATCH'].includes(method) && request.body) {
                requestMetadata['body'] = this.sanitizeBody(request.body);
            }

            const responseMetadata = {
                statusCode,
                size: parseInt(resContentLength || '0', 10),
            };

            this.structuredLogger.logHttpRequest(
                message,
                logContext,
                requestMetadata,
                responseMetadata,
                duration,
            );
        });

        next();
    }

    private sanitizeHeaders(headers: any): any {
        const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
        const sanitized = { ...headers };

        for (const header of sensitiveHeaders) {
            if (sanitized[header]) {
                sanitized[header] = '***REDACTED***';
            }
        }

        return sanitized;
    }

    private sanitizeBody(body: any): any {
        if (!body || typeof body !== 'object') {
            return body;
        }

        const sensitiveFields = [
            'password',
            'token',
            'secret',
            'apiKey',
            'api_key',
            'accessToken',
            'refreshToken',
            'privateKey',
            'clientSecret',
        ];

        const sanitized = { ...body };

        for (const field of sensitiveFields) {
            if (sanitized[field]) {
                sanitized[field] = '***REDACTED***';
            }
        }

        return sanitized;
    }
} 