import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    // Este guard activa la 'jwt' strategy (JwtStrategy)
    // La lógica de validación del token y extracción del payload está en JwtStrategy.validate()

    // Opcionalmente, puedes sobreescribir handleRequest para personalizar el manejo de errores
    // o para permitir acceso incluso si el token no es válido (por ejemplo, para rutas opcionalmente autenticadas)
    /*
    handleRequest(err, user, info, context: ExecutionContext) {
        // err: Error durante la validación (ej: token inválido, expirado)
        // user: Payload devuelto por JwtStrategy.validate (o false si falló)
        // info: Información adicional, como el error específico (JsonWebTokenError, TokenExpiredError)
        
        if (err || !user) {
            // Puedes loggear info.message o err.message
            throw err || new UnauthorizedException(info?.message || 'Invalid or expired token');
        }
        return user; // Si es válido, devuelve el usuario (adjuntado a req.user)
    }
    */
} 