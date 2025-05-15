import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class TenantIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Ya no modificamos req.body aquí.
    // Los servicios que necesiten tenantId deben obtenerlo de req.user.tenantId
    // (asumiendo que JwtAuthGuard lo añade a req.user)
    /* // Comentar la lógica de inyección
        const req = context.switchToHttp().getRequest();
        if (req.user && req.user.tenantId) {
            if (req.body && typeof req.body === 'object' && !req.body.tenantId) {
                req.body.tenantId = req.user.tenantId;
            }
        }
        */ // Fin del comentario
    return next.handle();
  }
}
