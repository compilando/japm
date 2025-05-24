import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { Request } from 'express';
import { AuditLoggerService, AuditResult } from '../services/audit-logger.service';
import { LogContext } from '../services/structured-logger.service';
import { AUDIT_METADATA_KEY, AuditMetadata } from '../decorators/audit.decorator';

interface RequestWithUser extends Request {
    user?: {
        userId?: string;
        tenantId?: string;
        id?: string;
    };
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
    constructor(
        private readonly auditLogger: AuditLoggerService,
        private readonly reflector: Reflector,
    ) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const auditMetadata = this.reflector.get<AuditMetadata>(
            AUDIT_METADATA_KEY,
            context.getHandler(),
        );

        if (!auditMetadata) {
            return next.handle();
        }

        const request = context.switchToHttp().getRequest<RequestWithUser>();
        const args = context.getArgs();

        // Extract audit context
        const logContext: LogContext = {
            userId: request.user?.userId || request.user?.id || 'anonymous',
            tenantId: request.user?.tenantId || 'unknown',
            ip: request.ip,
            userAgent: request.get('user-agent'),
            operation: `${auditMetadata.action}_${auditMetadata.resourceType}`,
            resourceType: auditMetadata.resourceType,
        };

        // Extract resourceId from parameters if specified
        let resourceId = 'unknown';
        if (auditMetadata.resourceIdParam) {
            const paramIndex = this.getParameterIndex(context, auditMetadata.resourceIdParam);
            if (paramIndex >= 0 && args[paramIndex]) {
                resourceId = args[paramIndex];
                logContext.resourceId = resourceId;
            }
        }

        // Extract projectId if available in the route
        const projectIdIndex = this.getParameterIndex(context, 'projectId');
        if (projectIdIndex >= 0 && args[projectIdIndex]) {
            logContext.projectId = args[projectIdIndex];
        }

        const startTime = Date.now();

        return next.handle().pipe(
            tap((result) => {
                // Success case
                const duration = Date.now() - startTime;
                let resourceName: string | undefined;

                // Extract resource name from result if specified
                if (auditMetadata.resourceNameField && result && typeof result === 'object') {
                    resourceName = result[auditMetadata.resourceNameField];
                }

                const auditData = {
                    resourceType: auditMetadata.resourceType,
                    resourceId,
                    resourceName,
                    details: {
                        duration,
                        method: request.method,
                        url: request.url,
                        userAgent: request.get('user-agent'),
                    },
                };

                // Include request body if specified
                if (auditMetadata.includeRequestBody && request.body) {
                    auditData.details['requestBody'] = this.sanitizeData(request.body);
                }

                // Include response body if specified
                if (auditMetadata.includeResponseBody && result) {
                    auditData.details['responseBody'] = this.sanitizeData(result);
                }

                // Log based on action type
                switch (auditMetadata.action) {
                    case 'CREATE':
                        this.auditLogger.logCreation(
                            logContext,
                            auditMetadata.resourceType,
                            resourceId,
                            resourceName,
                            auditMetadata.includeResponseBody ? result : undefined,
                        );
                        break;
                    case 'UPDATE':
                        this.auditLogger.logUpdate(
                            logContext,
                            auditMetadata.resourceType,
                            resourceId,
                            resourceName,
                            auditMetadata.includeRequestBody ? request.body : undefined,
                            auditMetadata.includeResponseBody ? result : undefined,
                        );
                        break;
                    case 'DELETE':
                        this.auditLogger.logDeletion(
                            logContext,
                            auditMetadata.resourceType,
                            resourceId,
                            resourceName,
                        );
                        break;
                    default:
                        this.auditLogger.logAuditEvent(
                            logContext,
                            {
                                action: auditMetadata.action,
                                resourceType: auditMetadata.resourceType,
                                resourceId,
                                resourceName,
                                result: AuditResult.SUCCESS,
                                details: auditData.details,
                                riskLevel: auditMetadata.riskLevel,
                            },
                        );
                }
            }),
            catchError((error) => {
                // Error case
                const duration = Date.now() - startTime;

                const auditData = {
                    resourceType: auditMetadata.resourceType,
                    resourceId,
                    details: {
                        duration,
                        method: request.method,
                        url: request.url,
                        userAgent: request.get('user-agent'),
                        errorType: error.constructor.name,
                        errorMessage: error.message,
                    },
                };

                // Log based on action type with error
                switch (auditMetadata.action) {
                    case 'CREATE':
                        this.auditLogger.logCreation(
                            logContext,
                            auditMetadata.resourceType,
                            resourceId,
                            undefined,
                            undefined,
                            error,
                        );
                        break;
                    case 'UPDATE':
                        this.auditLogger.logUpdate(
                            logContext,
                            auditMetadata.resourceType,
                            resourceId,
                            undefined,
                            undefined,
                            undefined,
                            undefined,
                            error,
                        );
                        break;
                    case 'DELETE':
                        this.auditLogger.logDeletion(
                            logContext,
                            auditMetadata.resourceType,
                            resourceId,
                            undefined,
                            undefined,
                            error,
                        );
                        break;
                    default:
                        this.auditLogger.logAuditEvent(
                            logContext,
                            {
                                action: auditMetadata.action,
                                resourceType: auditMetadata.resourceType,
                                resourceId,
                                result: AuditResult.FAILURE,
                                details: auditData.details,
                                riskLevel: auditMetadata.riskLevel,
                            },
                            error,
                        );
                }

                return throwError(() => error);
            }),
        );
    }

    private getParameterIndex(context: ExecutionContext, paramName: string): number {
        const request = context.switchToHttp().getRequest();
        const paramNames = Object.keys(request.params || {});
        return paramNames.indexOf(paramName);
    }

    private sanitizeData(data: any): any {
        if (!data) return data;

        // Remove sensitive fields
        const sensitiveFields = ['password', 'token', 'secret', 'key', 'apiKey'];

        if (typeof data === 'object' && data !== null) {
            const sanitized = { ...data };
            for (const field of sensitiveFields) {
                if (sanitized[field]) {
                    sanitized[field] = '***REDACTED***';
                }
            }
            return sanitized;
        }

        return data;
    }
} 