import { Controller, Request, Post, UseGuards, Get, Body, UsePipes, ValidationPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard'; // We will create this guard
import { JwtAuthGuard } from './guards/jwt-auth.guard'; // We will create this guard
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ApiTags, ApiBody, ApiOperation, ApiResponse, ApiBearerAuth, ApiProperty } from '@nestjs/swagger';
import { User } from '@prisma/client';

// DTO for Login response
class LoginResponse {
    @ApiProperty()
    access_token: string;
}

// DTO for Register/Profile response (without password)
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

    // Use LocalAuthGuard to activate LocalStrategy
    @UseGuards(LocalAuthGuard)
    @Post('login')
    @ApiOperation({ summary: 'Log in a user' })
    @ApiBody({ type: LoginDto })
    @ApiResponse({ status: 200, description: 'Login successful, returns JWT token.', type: LoginResponse })
    @ApiResponse({ status: 401, description: 'Unauthorized (Invalid Credentials).' })
    @HttpCode(HttpStatus.OK) // Change from 201 to 200 for login
    async login(@Request() req): Promise<{ access_token: string }> {
        // LocalAuthGuard (via LocalStrategy) already validated and attached user to req.user
        return this.authService.login(req.user); // user here does not have password
    }

    // Protected by JwtAuthGuard
    @UseGuards(JwtAuthGuard)
    @Get('profile')
    @ApiOperation({ summary: 'Get current user profile' })
    @ApiBearerAuth() // Indicates Bearer token required in Swagger
    @ApiResponse({ status: 200, description: 'User profile data.', type: UserProfileResponse })
    @ApiResponse({ status: 401, description: 'Unauthorized (Invalid or missing token).' })
    getProfile(@Request() req): Promise<Omit<User, 'password'>> {
        // JwtAuthGuard (via JwtStrategy) validated the token and attached data to req.user
        // Assuming JwtStrategy.validate returns { userId: string, email: string }
        // We need to get the full profile from the service
        return this.authService.getProfile(req.user.userId);
    }
} 