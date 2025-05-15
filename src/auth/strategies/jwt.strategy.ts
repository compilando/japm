import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../user/user.service'; // Adjust path

// Payload expected in the JWT (defined in AuthService.login)
export interface JwtPayload {
  sub: string; // Standard JWT field for user ID
  email: string;
  tenantId: string;
  // You can add roles or other info if included in the payload during login
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  // Logger needs to be static or initialized after super() if used in constructor before super()
  // Alternatively, check config before super() and don't use instance logger for that check.
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private configService: ConfigService, // Keep injected services
    private userService: UserService,
  ) {
    // Fetch secret BEFORE super() without using 'this'
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      // Use console.error or throw directly if logger cannot be used here
      console.error(
        'FATAL ERROR: JWT_SECRET environment variable is not set. Application cannot start securely.',
      );
      throw new Error('JWT_SECRET environment variable is not set.');
    }

    // super() must be called first using the validated secret
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret, // Now guaranteed to be a string
    });

    // Log initialization after super() call is safe
    this.logger.log('JwtStrategy initialized.');
  }

  // Passport calls this after verifying the JWT signature and that it hasn't expired
  async validate(payload: JwtPayload): Promise<any> {
    // this.logger.log(`Validating JWT payload...`);
    // this.logger.debug(`Received payload: ${JSON.stringify(payload)}`);

    if (!payload || !payload.sub) {
      this.logger.warn(
        'JWT validation failed: Payload or payload.sub is missing.',
      );
      throw new UnauthorizedException('Invalid token payload.');
    }

    // payload is the decoded JWT object
    // Here you can perform additional validations if desired
    // Example: verify that the user still exists in the DB
    try {
      this.logger.debug(`Attempting to find user by ID (sub): ${payload.sub}`);
      const user = await this.userService.findOneById(payload.sub);
      if (!user) {
        this.logger.warn(
          `User lookup failed: User with ID ${payload.sub} not found.`,
        );
        throw new UnauthorizedException(
          'User associated with token not found.',
        );
      }
      this.logger.log(`User found for ID ${payload.sub}: ${user.email}`);

      // Whatever you return here will be attached to request.user
      // Return only necessary, non-sensitive information
      const result = {
        userId: payload.sub,
        email: payload.email,
        tenantId: user.tenantId,
        role: user.role,
      };
      //this.logger.debug(`Validation successful. Returning user data for request.user: ${JSON.stringify(result)}`);
      return result;
      // Or you could return the full User object (without password) if needed:
      // const { password, ...userResult } = user;
      // return userResult;
    } catch (error) {
      this.logger.error(
        `Error during user lookup or validation for sub ${payload.sub}:`,
        error.stack || error,
      );
      if (error instanceof UnauthorizedException) {
        throw error; // Re-throw specific unauthorized error
      }
      // Throw a generic one for other unexpected errors during validation
      throw new UnauthorizedException('Error validating user token.');
    }
  }
}
