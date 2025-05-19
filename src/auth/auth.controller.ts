import {
  Controller,
  Request,
  Post,
  UseGuards,
  Get,
  Body,
  UsePipes,
  ValidationPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard'; // We will create this guard
import { JwtAuthGuard } from './guards/jwt-auth.guard'; // We will create this guard
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import {
  ApiTags,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiProperty,
} from '@nestjs/swagger';
import { User } from '@prisma/client';

// DTO for Login response
class LoginResponse {
  @ApiProperty({
    description: 'JWT access token for authentication',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  })
  access_token: string;
}

// DTO for Register/Profile response (without password)
class UserProfileResponse {
  @ApiProperty({
    description: 'Unique user identifier',
    example: 'clg123xyz'
  })
  id: string;

  @ApiProperty({
    description: 'User\'s email address',
    example: 'user@example.com'
  })
  email: string;

  @ApiProperty({
    description: 'User\'s full name',
    example: 'John Doe'
  })
  name: string;

  @ApiProperty({
    description: 'Account creation timestamp',
    example: '2024-03-20T10:30:00Z'
  })
  createdAt: Date;
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @Post('register')
  @ApiOperation({
    summary: 'Register new user',
    description: 'Creates a new user account in the system. This endpoint is publicly accessible.'
  })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    type: UserProfileResponse
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data - Check the request body format'
  })
  @ApiResponse({
    status: 409,
    description: 'Email already exists - The provided email is already registered'
  })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() registerDto: RegisterDto,
  ): Promise<Omit<User, 'password'>> {
    return this.authService.register(registerDto);
  }

  // Use LocalAuthGuard to activate LocalStrategy
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @ApiOperation({
    summary: 'User login',
    description: 'Authenticates a user and returns a JWT token for subsequent API calls'
  })
  @ApiBody({
    type: LoginDto,
    description: 'User credentials for authentication'
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful - Returns JWT token',
    type: LoginResponse
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials - Email or password is incorrect'
  })
  @HttpCode(HttpStatus.OK) // Change from 201 to 200 for login
  async login(@Request() req): Promise<{ access_token: string }> {
    // LocalAuthGuard (via LocalStrategy) already validated and attached user to req.user
    return this.authService.login(req.user); // user here does not have password
  }

  // Protected by JwtAuthGuard
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiOperation({
    summary: 'Get user profile',
    description: 'Retrieves the profile information of the currently authenticated user'
  })
  @ApiBearerAuth() // Indicates Bearer token required in Swagger
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    type: UserProfileResponse
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or expired token'
  })
  getProfile(@Request() req): Promise<Omit<User, 'password'>> {
    // JwtAuthGuard (via JwtStrategy) validated the token and attached data to req.user
    // Assuming JwtStrategy.validate returns { userId: string, email: string }
    // We need to get the full profile from the service
    return this.authService.getProfile(req.user.userId);
  }
}
