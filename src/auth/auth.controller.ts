import { Controller, Request, Post, UseGuards, Get, Body, UsePipes, ValidationPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard'; // Crearemos este guard
import { JwtAuthGuard } from './guards/jwt-auth.guard'; // Crearemos este guard
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ApiTags, ApiBody, ApiOperation, ApiResponse, ApiBearerAuth, ApiProperty } from '@nestjs/swagger';
import { User } from '@prisma/client';

// DTO para la respuesta de Login
class LoginResponse {
    @ApiProperty()
    access_token: string;
}

// DTO para la respuesta de Registro/Perfil (sin password)
class UserProfileResponse {
    @ApiProperty()
    id: string;
    @ApiProperty()
    email: string;
    @ApiProperty()
    name: string;
    @ApiProperty()
    createdAt: Date;
}


@ApiTags('Authentication')
@Controller('api/auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('register')
    @ApiOperation({ summary: 'Register a new user' })
    @ApiResponse({ status: 201, description: 'User successfully registered.', type: UserProfileResponse })
    @ApiResponse({ status: 400, description: 'Invalid input data.' })
    @ApiResponse({ status: 409, description: 'Email already exists.' })
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    @HttpCode(HttpStatus.CREATED)
    async register(@Body() registerDto: RegisterDto): Promise<Omit<User, 'password'>> {
        return this.authService.register(registerDto);
    }

    // Usa LocalAuthGuard para activar LocalStrategy
    @UseGuards(LocalAuthGuard)
    @Post('login')
    @ApiOperation({ summary: 'Log in a user' })
    @ApiBody({ type: LoginDto })
    @ApiResponse({ status: 200, description: 'Login successful, returns JWT token.', type: LoginResponse })
    @ApiResponse({ status: 401, description: 'Unauthorized (Invalid Credentials).' })
    @HttpCode(HttpStatus.OK) // Cambia de 201 a 200 para login
    async login(@Request() req): Promise<{ access_token: string }> {
        // LocalAuthGuard (via LocalStrategy) ya validó y adjuntó user a req.user
        return this.authService.login(req.user); // user aquí no tiene password
    }

    // Protegido por JwtAuthGuard
    @UseGuards(JwtAuthGuard)
    @Get('profile')
    @ApiOperation({ summary: 'Get current user profile' })
    @ApiBearerAuth() // Indica que requiere Bearer token en Swagger
    @ApiResponse({ status: 200, description: 'User profile data.', type: UserProfileResponse })
    @ApiResponse({ status: 401, description: 'Unauthorized (Invalid or missing token).' })
    getProfile(@Request() req): Promise<Omit<User, 'password'>> {
        // JwtAuthGuard (via JwtStrategy) validó el token y adjuntó datos a req.user
        // Asumiendo que JwtStrategy.validate devuelve { userId: string, email: string }
        // Necesitamos obtener el perfil completo desde el servicio
        return this.authService.getProfile(req.user.userId);
    }
} 