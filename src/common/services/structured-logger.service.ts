import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface LogContext {
  userId?: string;
  tenantId?: string;
  projectId?: string;
  resourceId?: string;
  resourceType?: string;
  operation?: string;
  ip?: string;
  userAgent?: string;
  requestId?: string;
  sessionId?: string;
}

export interface LogMetadata {
  duration?: number;
  statusCode?: number;
  error?: {
    code: string;
    message: string;
    stack?: string;
  };
  request?: {
    method: string;
    url: string;
    body?: any;
    query?: any;
    headers?: any;
  };
  response?: {
    statusCode: number;
    size?: number;
  };
  businessData?: Record<string, any>;
}

export interface StructuredLogEntry {
  timestamp: string;
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  context: LogContext;
  metadata?: LogMetadata;
  category: 'http' | 'audit' | 'business' | 'system' | 'security';
  environment: string;
  application: string;
  version: string;
}

@Injectable()
export class StructuredLoggerService {
  private readonly logger = new Logger(StructuredLoggerService.name);
  private readonly logLevel: string;
  private readonly environment: string;
  private readonly applicationName = 'japm';
  private readonly version = '1.0.0';

  constructor(private configService: ConfigService) {
    this.logLevel = this.configService.get('LOG_LEVEL', 'info');
    this.environment = this.configService.get('NODE_ENV', 'development');
  }

  private createStructuredLog(
    level: StructuredLogEntry['level'],
    message: string,
    context: LogContext,
    metadata?: LogMetadata,
    category: StructuredLogEntry['category'] = 'system',
  ): StructuredLogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      metadata,
      category,
      environment: this.environment,
      application: this.applicationName,
      version: this.version,
    };
  }

  private logStructured(entry: StructuredLogEntry): void {
    // Replacer para manejar referencias circulares y objetos problemáticos
    const replacer = (key: string, value: any) => {
      // Evitar referencias circulares creando un Set para trackear objetos visitados
      if (value && typeof value === 'object') {
        // Filtrar objetos problemáticos específicos
        if (
          value.constructor &&
          (value.constructor.name === 'Socket' ||
            value.constructor.name === 'HTTPParser' ||
            value.constructor.name === 'TLSSocket' ||
            value.constructor.name === 'IncomingMessage' ||
            value.constructor.name === 'ServerResponse')
        ) {
          return '[Filtered Object]';
        }

        // Si el objeto tiene propiedades circulares comunes, filtrarlas
        if (
          key === 'socket' ||
          key === 'parser' ||
          key === 'req' ||
          key === 'res'
        ) {
          return '[Filtered Circular Reference]';
        }
      }
      return value;
    };

    try {
      const logMessage = JSON.stringify(
        entry,
        replacer,
        this.environment === 'development' ? 2 : 0,
      );

      /*
      switch (entry.level) {
        case 'error':
          this.logger.error(
            logMessage,
            entry.context?.operation || 'StructuredLog',
          );
          break;
        case 'warn':
          this.logger.warn(
            logMessage,
            entry.context?.operation || 'StructuredLog',
          );
          break;
        case 'info':
          this.logger.log(
            logMessage,
            entry.context?.operation || 'StructuredLog',
          );
          break;
        case 'debug':
          this.logger.debug(
            logMessage,
            entry.context?.operation || 'StructuredLog',
          );
          break;
      }      
      this.logger.log(logMessage, entry.context?.operation || 'StructuredLog');
      */
    } catch (error) {
      // Fallback si aún hay problemas de serialización
      const fallbackMessage = `[JSON Serialization Error] ${entry.message} - Context: ${JSON.stringify(entry.context, null, 0)}`;
      this.logger.error(
        fallbackMessage,
        entry.context?.operation || 'StructuredLog',
      );
    }
  }

  // Public methods for structured logging
  info(
    message: string,
    context: LogContext,
    metadata?: LogMetadata,
    category?: StructuredLogEntry['category'],
  ): void {
    const entry = this.createStructuredLog(
      'info',
      message,
      context,
      metadata,
      category,
    );
    this.logStructured(entry);
  }

  warn(
    message: string,
    context: LogContext,
    metadata?: LogMetadata,
    category?: StructuredLogEntry['category'],
  ): void {
    const entry = this.createStructuredLog(
      'warn',
      message,
      context,
      metadata,
      category,
    );
    this.logStructured(entry);
  }

  error(
    message: string,
    context: LogContext,
    metadata?: LogMetadata,
    category?: StructuredLogEntry['category'],
  ): void {
    const entry = this.createStructuredLog(
      'error',
      message,
      context,
      metadata,
      category,
    );
    this.logStructured(entry);
  }

  debug(
    message: string,
    context: LogContext,
    metadata?: LogMetadata,
    category?: StructuredLogEntry['category'],
  ): void {
    const entry = this.createStructuredLog(
      'debug',
      message,
      context,
      metadata,
      category,
    );
    this.logStructured(entry);
  }

  // Helper method for HTTP requests
  logHttpRequest(
    message: string,
    context: LogContext,
    request: {
      method: string;
      url: string;
      body?: any;
      query?: any;
      headers?: any;
    },
    response?: {
      statusCode: number;
      size?: number;
    },
    duration?: number,
    error?: {
      code: string;
      message: string;
      stack?: string;
    },
  ): void {
    const metadata: LogMetadata = {
      duration,
      request,
      response,
      error,
    };

    const level = error
      ? 'error'
      : response && response.statusCode >= 400
        ? 'warn'
        : 'info';
    const entry = this.createStructuredLog(
      level,
      message,
      context,
      metadata,
      'http',
    );
    this.logStructured(entry);
  }
}
