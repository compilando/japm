import { Injectable } from '@nestjs/common';
import { StructuredLoggerService, LogContext } from './structured-logger.service';

export enum AuditAction {
    CREATE = 'CREATE',
    UPDATE = 'UPDATE',
    DELETE = 'DELETE',
    VIEW = 'VIEW',
    LIST = 'LIST',
    EXECUTE = 'EXECUTE',
    LOGIN = 'LOGIN',
    LOGOUT = 'LOGOUT',
    PUBLISH = 'PUBLISH',
    UNPUBLISH = 'UNPUBLISH',
    APPROVE = 'APPROVE',
    REJECT = 'REJECT',
}

export enum AuditResult {
    SUCCESS = 'SUCCESS',
    FAILURE = 'FAILURE',
    PARTIAL = 'PARTIAL',
}

export interface AuditLogEntry {
    action: AuditAction;
    resourceType: string;
    resourceId: string;
    resourceName?: string;
    result: AuditResult;
    details?: Record<string, any>;
    previousState?: Record<string, any>;
    newState?: Record<string, any>;
    reason?: string;
    riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

@Injectable()
export class AuditLoggerService {
    constructor(private structuredLogger: StructuredLoggerService) { }

    private determineRiskLevel(action: AuditAction, resourceType: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
        // Operaciones de eliminación son siempre de alto riesgo
        if (action === AuditAction.DELETE) {
            return 'HIGH';
        }

        // Operaciones de autenticación son críticas
        if (action === AuditAction.LOGIN || action === AuditAction.LOGOUT) {
            return 'MEDIUM';
        }

        // Operaciones de publicación/administración son de riesgo medio-alto
        if ([AuditAction.PUBLISH, AuditAction.APPROVE, AuditAction.REJECT].includes(action)) {
            return 'MEDIUM';
        }

        // Creación y modificación de recursos críticos
        if ([AuditAction.CREATE, AuditAction.UPDATE].includes(action)) {
            const criticalResources = ['User', 'Project', 'Tenant', 'AIModel'];
            return criticalResources.includes(resourceType) ? 'MEDIUM' : 'LOW';
        }

        // Operaciones de lectura son de bajo riesgo
        return 'LOW';
    }

    /**
     * Log an audit event for any business operation
     */
    logAuditEvent(
        context: LogContext,
        auditEntry: AuditLogEntry,
        error?: Error
    ): void {
        const riskLevel = auditEntry.riskLevel || this.determineRiskLevel(auditEntry.action, auditEntry.resourceType);

        const message = error
            ? `AUDIT FAILURE: ${auditEntry.action} ${auditEntry.resourceType}(${auditEntry.resourceId}) failed`
            : `AUDIT: ${auditEntry.action} ${auditEntry.resourceType}(${auditEntry.resourceId}) ${auditEntry.result}`;

        const metadata = {
            businessData: {
                action: auditEntry.action,
                resourceType: auditEntry.resourceType,
                resourceId: auditEntry.resourceId,
                resourceName: auditEntry.resourceName,
                result: auditEntry.result,
                riskLevel,
                details: auditEntry.details,
                previousState: auditEntry.previousState,
                newState: auditEntry.newState,
                reason: auditEntry.reason,
            },
            error: error ? {
                code: error.name,
                message: error.message,
                stack: error.stack,
            } : undefined,
        };

        const level = error ? 'error' : (riskLevel === 'CRITICAL' || riskLevel === 'HIGH') ? 'warn' : 'info';

        this.structuredLogger[level](
            message,
            {
                ...context,
                operation: `${auditEntry.action}_${auditEntry.resourceType}`,
                resourceType: auditEntry.resourceType,
                resourceId: auditEntry.resourceId,
            },
            metadata,
            'audit'
        );
    }

    /**
     * Specialized method for DELETE operations (high risk)
     */
    logDeletion(
        context: LogContext,
        resourceType: string,
        resourceId: string,
        resourceName?: string,
        deletedData?: Record<string, any>,
        error?: Error
    ): void {
        this.logAuditEvent(
            context,
            {
                action: AuditAction.DELETE,
                resourceType,
                resourceId,
                resourceName,
                result: error ? AuditResult.FAILURE : AuditResult.SUCCESS,
                details: { deletedAt: new Date().toISOString() },
                previousState: deletedData,
                riskLevel: 'HIGH',
            },
            error
        );
    }

    /**
     * Specialized method for CREATE operations
     */
    logCreation(
        context: LogContext,
        resourceType: string,
        resourceId: string,
        resourceName?: string,
        createdData?: Record<string, any>,
        error?: Error
    ): void {
        this.logAuditEvent(
            context,
            {
                action: AuditAction.CREATE,
                resourceType,
                resourceId,
                resourceName,
                result: error ? AuditResult.FAILURE : AuditResult.SUCCESS,
                details: { createdAt: new Date().toISOString() },
                newState: createdData,
            },
            error
        );
    }

    /**
     * Specialized method for UPDATE operations
     */
    logUpdate(
        context: LogContext,
        resourceType: string,
        resourceId: string,
        resourceName?: string,
        previousData?: Record<string, any>,
        newData?: Record<string, any>,
        changedFields?: string[],
        error?: Error
    ): void {
        this.logAuditEvent(
            context,
            {
                action: AuditAction.UPDATE,
                resourceType,
                resourceId,
                resourceName,
                result: error ? AuditResult.FAILURE : AuditResult.SUCCESS,
                details: {
                    updatedAt: new Date().toISOString(),
                    changedFields: changedFields || [],
                },
                previousState: previousData,
                newState: newData,
            },
            error
        );
    }

    /**
     * Specialized method for EXECUTE operations (LLM executions, etc.)
     */
    logExecution(
        context: LogContext,
        resourceType: string,
        resourceId: string,
        executionDetails: {
            input?: any;
            output?: any;
            duration?: number;
            modelUsed?: string;
            tokensUsed?: number;
        },
        error?: Error
    ): void {
        this.logAuditEvent(
            context,
            {
                action: AuditAction.EXECUTE,
                resourceType,
                resourceId,
                result: error ? AuditResult.FAILURE : AuditResult.SUCCESS,
                details: {
                    executedAt: new Date().toISOString(),
                    ...executionDetails,
                },
            },
            error
        );
    }

    /**
     * Specialized method for authentication events
     */
    logAuthentication(
        action: AuditAction.LOGIN | AuditAction.LOGOUT,
        context: LogContext,
        details?: {
            method?: string;
            provider?: string;
            deviceInfo?: string;
        },
        error?: Error
    ): void {
        this.logAuditEvent(
            context,
            {
                action,
                resourceType: 'Authentication',
                resourceId: context.userId || 'unknown',
                result: error ? AuditResult.FAILURE : AuditResult.SUCCESS,
                details: {
                    timestamp: new Date().toISOString(),
                    ...details,
                },
                riskLevel: 'MEDIUM',
            },
            error
        );
    }
} 