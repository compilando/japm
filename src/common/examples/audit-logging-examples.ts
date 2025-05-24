/**
 * EJEMPLOS DE USO DEL SISTEMA DE AUDIT LOGGING
 * 
 * Este archivo contiene ejemplos de cómo implementar el sistema de audit logging
 * en diferentes servicios y controladores de la aplicación JAPM.
 */

import { Injectable, Controller, Post, Delete, Body, Param, Req } from '@nestjs/common';
import { AuditLoggerService, AuditAction } from '../services/audit-logger.service';
import { StructuredLoggerService, LogContext } from '../services/structured-logger.service';
import { AuditDelete, AuditCreate, AuditUpdate, Audit } from '../decorators/audit.decorator';

// ============================================================================
// EJEMPLO 1: USO MANUAL EN UN SERVICIO
// ============================================================================

@Injectable()
export class ExampleService {
    constructor(
        private auditLogger: AuditLoggerService,
        private structuredLogger: StructuredLoggerService,
    ) { }

    async createProject(
        createDto: any,
        userId: string,
        tenantId: string
    ): Promise<any> {
        const context: LogContext = {
            userId,
            tenantId,
            operation: 'CREATE_PROJECT',
            resourceType: 'Project',
        };

        try {
            // Simulate project creation
            const project = { id: 'project-123', name: createDto.name, ...createDto };

            // Log successful creation
            this.auditLogger.logCreation(
                context,
                'Project',
                project.id,
                project.name,
                project,
            );

            return project;
        } catch (error) {
            // Log failed creation
            this.auditLogger.logCreation(
                context,
                'Project',
                'unknown',
                createDto.name,
                createDto,
                error,
            );
            throw error;
        }
    }

    async deleteProject(
        projectId: string,
        userId: string,
        tenantId: string
    ): Promise<void> {
        const context: LogContext = {
            userId,
            tenantId,
            projectId,
            operation: 'DELETE_PROJECT',
            resourceType: 'Project',
            resourceId: projectId,
        };

        try {
            // Get project data before deletion for audit
            const project = { id: projectId, name: 'Example Project', /* ... */ };

            // Simulate deletion
            // await this.prisma.project.delete({ where: { id: projectId } });

            // Log successful deletion with original data
            this.auditLogger.logDeletion(
                context,
                'Project',
                projectId,
                project.name,
                project, // Full project data before deletion
            );

        } catch (error) {
            // Log failed deletion
            this.auditLogger.logDeletion(
                context,
                'Project',
                projectId,
                undefined,
                undefined,
                error,
            );
            throw error;
        }
    }
}

// ============================================================================
// EJEMPLO 2: USO CON DECORATORS EN CONTROLADORES
// ============================================================================

@Controller('examples')
export class ExampleController {
    constructor(private exampleService: ExampleService) { }

    @Post()
    @AuditCreate('Example', {
        includeResponseBody: true,
        riskLevel: 'MEDIUM'
    })
    async create(@Body() createDto: any, @Req() req: any) {
        // El decorator automáticamente registrará esta operación
        return this.exampleService.createProject(
            createDto,
            req.user.userId,
            req.user.tenantId
        );
    }

    @Delete(':id')
    @AuditDelete('Example', {
        resourceIdParam: 'id',
        riskLevel: 'HIGH'
    })
    async remove(@Param('id') id: string, @Req() req: any) {
        // El decorator automáticamente registrará esta operación de eliminación
        return this.exampleService.deleteProject(id, req.user.userId, req.user.tenantId);
    }
}

// ============================================================================
// EJEMPLO 3: AUDIT LOGGING PARA OPERACIONES DE AUTENTICACIÓN
// ============================================================================

@Injectable()
export class ExampleAuthService {
    constructor(private auditLogger: AuditLoggerService) { }

    async login(email: string, password: string, ip: string, userAgent: string) {
        const context: LogContext = {
            userId: email, // Before we know the actual userId
            ip,
            userAgent,
            operation: 'LOGIN',
        };

        try {
            // Simulate authentication
            const user = { id: 'user-123', email, tenantId: 'tenant-123' };

            // Update context with actual user data
            context.userId = user.id;
            context.tenantId = user.tenantId;

            // Log successful authentication
            this.auditLogger.logAuthentication(
                AuditAction.LOGIN,
                context,
                {
                    method: 'email_password',
                    provider: 'local',
                    deviceInfo: userAgent,
                },
            );

            return user;
        } catch (error) {
            // Log failed authentication
            this.auditLogger.logAuthentication(
                AuditAction.LOGIN,
                context,
                {
                    method: 'email_password',
                    provider: 'local',
                    deviceInfo: userAgent,
                },
                error,
            );
            throw error;
        }
    }
}

// ============================================================================
// EJEMPLO 4: AUDIT LOGGING PARA OPERACIONES DE EJECUCIÓN LLM
// ============================================================================

@Injectable()
export class ExampleLLMService {
    constructor(private auditLogger: AuditLoggerService) { }

    async executePrompt(
        promptId: string,
        input: any,
        userId: string,
        tenantId: string,
        projectId: string,
    ) {
        const startTime = Date.now();
        const context: LogContext = {
            userId,
            tenantId,
            projectId,
            resourceId: promptId,
            resourceType: 'PromptExecution',
            operation: 'EXECUTE_PROMPT',
        };

        try {
            // Simulate LLM execution
            const result = { output: 'Generated response', tokensUsed: 150 };
            const duration = Date.now() - startTime;

            // Log successful execution
            this.auditLogger.logExecution(
                context,
                'PromptExecution',
                promptId,
                {
                    input,
                    output: result.output,
                    duration,
                    tokensUsed: result.tokensUsed,
                    modelUsed: 'gpt-4',
                },
            );

            return result;
        } catch (error) {
            const duration = Date.now() - startTime;

            // Log failed execution
            this.auditLogger.logExecution(
                context,
                'PromptExecution',
                promptId,
                {
                    input,
                    duration,
                    modelUsed: 'gpt-4',
                },
                error,
            );
            throw error;
        }
    }
}

// ============================================================================
// EJEMPLO 5: STRUCTURED LOGGING PARA EVENTOS DE NEGOCIO
// ============================================================================

@Injectable()
export class ExampleBusinessService {
    constructor(private structuredLogger: StructuredLoggerService) { }

    async processPayment(
        paymentData: any,
        userId: string,
        tenantId: string,
    ) {
        const context: LogContext = {
            userId,
            tenantId,
            operation: 'PROCESS_PAYMENT',
        };

        // Log business event with structured data
        this.structuredLogger.info(
            'Payment processing started',
            context,
            {
                businessData: {
                    paymentId: paymentData.id,
                    amount: paymentData.amount,
                    currency: paymentData.currency,
                    provider: paymentData.provider,
                },
            },
            'business',
        );

        try {
            // Simulate payment processing
            const result = { status: 'success', transactionId: 'tx-123' };

            // Log successful payment
            this.structuredLogger.info(
                'Payment processed successfully',
                context,
                {
                    businessData: {
                        paymentId: paymentData.id,
                        transactionId: result.transactionId,
                        amount: paymentData.amount,
                        status: result.status,
                    },
                },
                'business',
            );

            return result;
        } catch (error) {
            // Log payment failure
            this.structuredLogger.error(
                'Payment processing failed',
                context,
                {
                    businessData: {
                        paymentId: paymentData.id,
                        amount: paymentData.amount,
                        errorCode: error.code,
                    },
                    error: {
                        code: error.name,
                        message: error.message,
                        stack: error.stack,
                    },
                },
                'business',
            );
            throw error;
        }
    }
}

// ============================================================================
// EJEMPLO 6: CUSTOM AUDIT DECORATOR PARA OPERACIONES ESPECÍFICAS
// ============================================================================

// Custom decorator para operaciones de publicación en marketplace
export const AuditPublish = (resourceType: string) =>
    Audit({
        action: AuditAction.PUBLISH,
        resourceType,
        resourceIdParam: 'id',
        includeRequestBody: true,
        riskLevel: 'MEDIUM',
    });

@Controller('marketplace')
export class ExampleMarketplaceController {
    @Post(':id/publish')
    @AuditPublish('PromptVersion')
    async publishToMarketplace(@Param('id') id: string, @Req() req: any) {
        // El decorator automáticamente registrará esta operación de publicación
        // return this.marketplaceService.publish(id, req.user);
    }
}

// ============================================================================
// NOTAS DE IMPLEMENTACIÓN:
// ============================================================================

/*
1. CONTEXTO OBLIGATORIO:
   - Siempre incluir userId, tenantId cuando esté disponible
   - Incluir projectId para operaciones relacionadas con proyectos
   - Agregar información de IP y userAgent para auditoría de seguridad

2. DATOS SENSIBLES:
   - Nunca loguear passwords, tokens, o API keys
   - El sistema automáticamente sanitiza campos sensibles conocidos
   - Para datos custom sensibles, sanitizar manualmente antes de loguear

3. NIVELES DE RIESGO:
   - LOW: Operaciones de lectura, listado
   - MEDIUM: Creación, actualización, autenticación
   - HIGH: Eliminación, operaciones administrativas
   - CRITICAL: Operaciones que afectan seguridad o datos críticos

4. DECORATORS VS MANUAL:
   - Usar decorators para operaciones CRUD estándar
   - Usar logging manual para lógica de negocio compleja
   - Combinar ambos cuando sea necesario

5. PERFORMANCE:
   - Los logs son asíncronos y no bloquean la operación principal
   - En producción, considerar usar un sistema de logs externos
   - Configurar niveles de log apropiados por ambiente
*/ 