import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP'); // 'HTTP' context for logs

  use(request: Request, response: Response, next: NextFunction): void {
    const start = Date.now(); // Marcar el inicio de la solicitud
    const { ip, method, originalUrl: url } = request;
    const userAgent = request.get('user-agent') || '';
    // const contentLength = request.get('content-length'); // No usado directamente en el log final propuesto

    // No registrar el cuerpo completo por defecto para evitar verbosidad y posible exposición de datos.
    // Se puede habilitar condicionalmente o loguear solo ciertos campos si es necesario.
    // const requestBody = JSON.stringify(request.body);

    // Log inicial de la solicitud (opcional, el log de respuesta es más completo)
    // this.logger.log(
    //    `REQ >>> ${method} ${url} - ${userAgent} ${ip}`
    // );

    response.on('finish', () => {
      const duration = Date.now() - start; // Calcular duración
      const { statusCode } = response;
      const resContentLength = response.get('content-length');

      let userId = 'anonymous';
      let tenantId = 'unknown';

      // Asumiendo que JwtAuthGuard (o similar) añade 'user' al request
      // y que request.user tiene la estructura esperada.
      if (request.user && typeof request.user === 'object') {
        // Acceso seguro a las propiedades de request.user
        userId = (request.user as any)?.userId || 'anonymous';
        tenantId = (request.user as any)?.tenantId || 'unknown';
      }

      const logMessage = `${method} ${url} - ${statusCode} - ${resContentLength || 0}b - ${duration}ms - User: ${userId} - Tenant: ${tenantId} - ${userAgent} ${ip}`;

      if (statusCode >= 500) {
        this.logger.error(`RES <<< ${logMessage}`);
      } else if (statusCode >= 400) {
        this.logger.warn(`RES <<< ${logMessage}`);
      } else {
        this.logger.log(`RES <<< ${logMessage}`);
      }
    });

    next();
  }
}
