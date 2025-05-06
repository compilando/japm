import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    // This guard activates the 'jwt' strategy (JwtStrategy)
    // The logic for token validation and payload extraction is in JwtStrategy.validate()

    // Optionally, you can override handleRequest to customize error handling
    // or to allow access even if the token is invalid (e.g., for optionally authenticated routes)
    /*
    handleRequest(err, user, info, context: ExecutionContext) {
        // err: Error during validation (e.g., invalid token, expired)
        // user: Payload returned by JwtStrategy.validate (or false if validation failed)
        // info: Additional information, such as the specific error (JsonWebTokenError, TokenExpiredError)
        
        if (err || !user) {
            // You can log info.message or err.message
            throw err || new UnauthorizedException(info?.message || 'Invalid or expired token');
        }
        return user; // If valid, return the user (attached to req.user)
    }
    */
} 