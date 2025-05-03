import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module'; // Importa UserModule para acceder a UserService
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
    imports: [
        UserModule, // Asegúrate que UserModule exporta UserService
        PassportModule, // Configuración básica de Passport
        ConfigModule, // Para acceder a variables de entorno
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
                signOptions: {
                    expiresIn: configService.get<string>('JWT_EXPIRATION_TIME') || '3600s',
                },
            }),
        }),
    ],
    controllers: [AuthController],
    providers: [
        AuthService,
        LocalStrategy, // Registrar LocalStrategy
        JwtStrategy,   // Registrar JwtStrategy
        // No necesitas proveer los Guards aquí si solo se usan con @UseGuards()
    ],
    exports: [AuthService], // Exportar si otros módulos lo necesitan
})
export class AuthModule { } 