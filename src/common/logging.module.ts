import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StructuredLoggerService } from './services/structured-logger.service';
import { AuditLoggerService } from './services/audit-logger.service';
import { AuditInterceptor } from './interceptors/audit.interceptor';

@Global()
@Module({
    imports: [ConfigModule],
    providers: [
        StructuredLoggerService,
        AuditLoggerService,
        AuditInterceptor,
    ],
    exports: [
        StructuredLoggerService,
        AuditLoggerService,
        AuditInterceptor,
    ],
})
export class LoggingModule { } 