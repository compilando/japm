import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { User } from '@prisma/client';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    // Pass options to super: default uses 'username' and 'password' fields.
    // Override if your DTO uses different names, e.g., { usernameField: 'email' }
    super({ usernameField: 'email' });
  }

  // Passport automatically calls this with credentials from request body
  async validate(email: string, pass: string): Promise<Omit<User, 'password'>> {
    const user = await this.authService.validateUser(email, pass);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    // Return user object (without password) - Passport attaches this to req.user
    const { password, ...result } = user;
    return result;
  }
}
