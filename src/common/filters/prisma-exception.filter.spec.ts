import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { PrismaClientExceptionFilter } from './prisma-exception.filter';
import { Prisma } from '@prisma/client';
import { ArgumentsHost } from '@nestjs/common';

describe('PrismaClientExceptionFilter', () => {
    let filter: PrismaClientExceptionFilter;
    let mockResponse: any;
    let mockRequest: any;
    let mockArgumentsHost: jest.Mocked<ArgumentsHost>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [PrismaClientExceptionFilter],
        }).compile();

        filter = module.get<PrismaClientExceptionFilter>(PrismaClientExceptionFilter);

        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };

        mockRequest = {
            url: '/test/path',
        };

        mockArgumentsHost = {
            switchToHttp: jest.fn().mockReturnValue({
                getResponse: jest.fn().mockReturnValue(mockResponse),
                getRequest: jest.fn().mockReturnValue(mockRequest),
            }),
            getArgs: jest.fn(),
            getArgByIndex: jest.fn(),
            switchToRpc: jest.fn(),
            switchToWs: jest.fn(),
            getType: jest.fn(),
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('P2002 - Unique constraint violation', () => {
        it('should handle unique constraint violation with target fields', () => {
            const exception = new Prisma.PrismaClientKnownRequestError(
                'Unique constraint failed',
                {
                    code: 'P2002',
                    clientVersion: '4.0.0',
                    meta: {
                        target: ['email', 'name'],
                    },
                },
            );

            filter.catch(exception, mockArgumentsHost);

            expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
            expect(mockResponse.json).toHaveBeenCalledWith({
                statusCode: HttpStatus.CONFLICT,
                message: 'Unique constraint failed on field(s): email, name',
                error: 'Conflict',
            });
        });

        it('should handle unique constraint violation without target fields', () => {
            const exception = new Prisma.PrismaClientKnownRequestError(
                'Unique constraint failed',
                {
                    code: 'P2002',
                    clientVersion: '4.0.0',
                    meta: {},
                },
            );

            filter.catch(exception, mockArgumentsHost);

            expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
            expect(mockResponse.json).toHaveBeenCalledWith({
                statusCode: HttpStatus.CONFLICT,
                message: 'Unique constraint failed on field(s): unknown',
                error: 'Conflict',
            });
        });
    });

    describe('P2025 - Record not found', () => {
        it('should handle record not found with cause in meta', () => {
            const exception = new Prisma.PrismaClientKnownRequestError(
                'Record to update not found',
                {
                    code: 'P2025',
                    clientVersion: '4.0.0',
                    meta: {
                        cause: 'Record with ID "123" not found',
                    },
                },
            );

            filter.catch(exception, mockArgumentsHost);

            expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
            expect(mockResponse.json).toHaveBeenCalledWith({
                statusCode: HttpStatus.NOT_FOUND,
                message: 'Record with ID "123" not found',
                error: 'Not Found',
            });
        });

        it('should handle record not found without cause in meta', () => {
            const exception = new Prisma.PrismaClientKnownRequestError(
                'Record to update not found',
                {
                    code: 'P2025',
                    clientVersion: '4.0.0',
                    meta: {},
                },
            );

            filter.catch(exception, mockArgumentsHost);

            expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
            expect(mockResponse.json).toHaveBeenCalledWith({
                statusCode: HttpStatus.NOT_FOUND,
                message: 'Required record not found.',
                error: 'Not Found',
            });
        });
    });

    describe('Unknown Prisma errors', () => {
        it('should handle unknown Prisma error codes as internal server error', () => {
            const exception = new Prisma.PrismaClientKnownRequestError(
                'Unknown Prisma error',
                {
                    code: 'P9999', // Unknown code
                    clientVersion: '4.0.0',
                    meta: {},
                },
            );

            filter.catch(exception, mockArgumentsHost);

            expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
            expect(mockResponse.json).toHaveBeenCalledWith('An internal server error occurred');
        });
    });
}); 