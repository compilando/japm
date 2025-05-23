import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { User } from '@prisma/client';

jest.mock('bcrypt');

describe('AuthService', () => {
    let service: AuthService;
    let userService: jest.Mocked<UserService>;
    let jwtService: jest.Mocked<JwtService>;

    const mockUser: User = {
        id: 'user-id-123',
        email: 'test@example.com',
        password: 'hashedPassword',
        name: 'Test User',
        role: 'user',
        tenantId: 'tenant-123',
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                {
                    provide: UserService,
                    useValue: {
                        findOneByEmail: jest.fn(),
                        create: jest.fn(),
                        findOneById: jest.fn(),
                    },
                },
                {
                    provide: JwtService,
                    useValue: {
                        sign: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
        userService = module.get(UserService);
        jwtService = module.get(JwtService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('validateUser', () => {
        it('should return user when credentials are valid', async () => {
            userService.findOneByEmail.mockResolvedValue(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);

            const result = await service.validateUser('test@example.com', 'password');

            expect(result).toEqual(mockUser);
            expect(userService.findOneByEmail).toHaveBeenCalledWith('test@example.com');
            expect(bcrypt.compare).toHaveBeenCalledWith('password', 'hashedPassword');
        });

        it('should return null when user does not exist', async () => {
            userService.findOneByEmail.mockResolvedValue(null);

            const result = await service.validateUser('test@example.com', 'password');

            expect(result).toBeNull();
            expect(bcrypt.compare).not.toHaveBeenCalled();
        });

        it('should return null when password is incorrect', async () => {
            userService.findOneByEmail.mockResolvedValue(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            const result = await service.validateUser('test@example.com', 'wrongpassword');

            expect(result).toBeNull();
            expect(bcrypt.compare).toHaveBeenCalledWith('wrongpassword', 'hashedPassword');
        });
    });

    describe('login', () => {
        it('should return access token for valid user', async () => {
            const userWithoutPassword = { ...mockUser };
            delete (userWithoutPassword as any).password;

            jwtService.sign.mockReturnValue('jwt-token-123');

            const result = await service.login(userWithoutPassword);

            expect(result).toEqual({ access_token: 'jwt-token-123' });
            expect(jwtService.sign).toHaveBeenCalledWith({
                email: mockUser.email,
                sub: mockUser.id,
                tenantId: mockUser.tenantId,
            });
        });
    });

    describe('register', () => {
        const registerDto = {
            email: 'new@example.com',
            password: 'password123',
            name: 'New User',
        };

        it('should register a new user successfully', async () => {
            const newUser = { ...mockUser, email: 'new@example.com', name: 'New User' };
            userService.create.mockResolvedValue(newUser);

            const result = await service.register(registerDto);

            expect(result).toEqual({
                id: newUser.id,
                email: newUser.email,
                name: newUser.name,
                role: newUser.role,
                tenantId: newUser.tenantId,
                createdAt: newUser.createdAt,
                updatedAt: newUser.updatedAt,
            });
            expect(userService.create).toHaveBeenCalledWith(registerDto, 'default-tenant-id');
        });

        it('should throw ConflictException when user already exists', async () => {
            userService.create.mockRejectedValue(new ConflictException('User already exists'));

            await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
        });

        it('should throw generic error for unexpected errors', async () => {
            userService.create.mockRejectedValue(new Error('Database error'));

            await expect(service.register(registerDto)).rejects.toThrow('Failed to register user.');
        });
    });

    describe('getProfile', () => {
        it('should return user profile without password', async () => {
            userService.findOneById.mockResolvedValue(mockUser);

            const result = await service.getProfile('user-id-123');

            expect(result).toEqual({
                id: mockUser.id,
                email: mockUser.email,
                name: mockUser.name,
                role: mockUser.role,
                tenantId: mockUser.tenantId,
                createdAt: mockUser.createdAt,
                updatedAt: mockUser.updatedAt,
            });
            expect(userService.findOneById).toHaveBeenCalledWith('user-id-123');
        });

        it('should throw NotFoundException when user does not exist', async () => {
            userService.findOneById.mockResolvedValue(null as any);

            await expect(service.getProfile('invalid-id')).rejects.toThrow(NotFoundException);
        });
    });
}); 