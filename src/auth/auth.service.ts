import { Injectable, UnauthorizedException, ConflictException, NotFoundException } from '@nestjs/common';
import { UserService } from '../user/user.service'; // Ajusta la ruta
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '@prisma/client';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './strategies/jwt.strategy'; // Import payload interface

@Injectable()
export class AuthService {
    constructor(
        private userService: UserService,
        private jwtService: JwtService
    ) { }

    // Usado por LocalStrategy
    async validateUser(email: string, pass: string): Promise<User | null> {
        const user = await this.userService.findOneByEmail(email);
        if (user && await bcrypt.compare(pass, user.password)) {
            // Devolvemos el usuario completo aquí (LocalStrategy quitará la contraseña)
            return user;
        }
        return null;
    }

    // Usado por AuthController /login después de LocalAuthGuard
    async login(user: Omit<User, 'password'>): Promise<{ access_token: string }> {
        // user aquí es el objeto devuelto por LocalStrategy.validate (sin password)
        const payload: JwtPayload = { email: user.email, sub: user.id };
        return {
            access_token: this.jwtService.sign(payload),
        };
    }

    // Usado por AuthController /register
    async register(registerDto: RegisterDto): Promise<Omit<User, 'password'>> {
        // Reutiliza el método create del UserService que ya hashea la contraseña
        try {
            const newUser = await this.userService.create(registerDto);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { password, ...result } = newUser; // No devolver password
            return result;
        } catch (error) {
            // Re-lanzar excepciones conocidas de userService.create
            if (error instanceof ConflictException) {
                throw error;
            }
            // Otros errores inesperados
            console.error("Error during user registration:", error);
            throw new Error('Failed to register user.');
        }
    }

    // Método para obtener perfil (usado por /profile endpoint)
    async getProfile(userId: string): Promise<Omit<User, 'password'>> {
        const user = await this.userService.findOneById(userId);
        if (!user) {
            // Esto no debería pasar si el token es válido y JwtStrategy verifica existencia
            throw new NotFoundException('User not found');
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...result } = user;
        return result;
    }
} 