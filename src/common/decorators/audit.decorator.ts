import { SetMetadata } from '@nestjs/common';
import { AuditAction } from '../services/audit-logger.service';

export const AUDIT_METADATA_KEY = 'audit_metadata';

export interface AuditMetadata {
    action: AuditAction;
    resourceType: string;
    resourceIdParam?: string; // Nombre del parámetro que contiene el resourceId
    resourceNameField?: string; // Campo del resultado que contiene el nombre del recurso
    includeRequestBody?: boolean;
    includeResponseBody?: boolean;
    riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

/**
 * Decorator para marcar métodos que requieren audit logging automático
 * 
 * @example
 * ```typescript
 * @Audit({
 *   action: AuditAction.DELETE,
 *   resourceType: 'Prompt',
 *   resourceIdParam: 'id',
 *   riskLevel: 'HIGH'
 * })
 * async remove(id: string, projectId: string): Promise<void> {
 *   // método implementation
 * }
 * ```
 */
export const Audit = (metadata: AuditMetadata) => SetMetadata(AUDIT_METADATA_KEY, metadata);

/**
 * Conveniente decorators para operaciones comunes
 */
export const AuditCreate = (resourceType: string, options?: Partial<AuditMetadata>) =>
    Audit({
        action: AuditAction.CREATE,
        resourceType,
        includeResponseBody: true,
        ...options,
    });

export const AuditUpdate = (resourceType: string, options?: Partial<AuditMetadata>) =>
    Audit({
        action: AuditAction.UPDATE,
        resourceType,
        resourceIdParam: 'id',
        includeRequestBody: true,
        includeResponseBody: true,
        ...options,
    });

export const AuditDelete = (resourceType: string, options?: Partial<AuditMetadata>) =>
    Audit({
        action: AuditAction.DELETE,
        resourceType,
        resourceIdParam: 'id',
        riskLevel: 'HIGH',
        ...options,
    });

export const AuditView = (resourceType: string, options?: Partial<AuditMetadata>) =>
    Audit({
        action: AuditAction.VIEW,
        resourceType,
        resourceIdParam: 'id',
        includeResponseBody: false,
        riskLevel: 'LOW',
        ...options,
    });

export const AuditList = (resourceType: string, options?: Partial<AuditMetadata>) =>
    Audit({
        action: AuditAction.LIST,
        resourceType,
        includeResponseBody: false,
        riskLevel: 'LOW',
        ...options,
    }); 