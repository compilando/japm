import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaClientExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaClientExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = HttpStatus.INTERNAL_SERVER_ERROR; // Default status
    const message = 'An internal server error occurred';

    // Solo loggear errores si no estamos en modo test
    if (process.env.NODE_ENV !== 'test') {
      this.logger.error(
        `Prisma Error ${exception.code} on path ${request.url}: ${exception.message}`,
        exception.stack,
        'PrismaClientExceptionFilter',
      );
    }

    let errorResponse: HttpException;

    switch (exception.code) {
      case 'P2002': {
        // Unique constraint violation
        const target = (exception.meta?.target as string[])?.join(', ');
        errorResponse = new ConflictException(
          `Unique constraint failed on field(s): ${target || 'unknown'}`,
        );
        break;
      }
      case 'P2025': {
        // Record to update or delete not found
        // The message might contain details, but often Prisma's default is enough
        errorResponse = new NotFoundException(
          exception.meta?.cause || 'Required record not found.',
        );
        break;
      }
      // Add other Prisma error codes you want to handle specifically
      // case 'P2003': // Foreign key constraint failed
      //     errorResponse = new ConflictException(`Foreign key constraint failed.`);
      //     break;
      default:
        // For unhandled Prisma known errors, keep the default internal server error
        errorResponse = new HttpException(message, status);
        break;
    }

    response
      .status(errorResponse.getStatus())
      .json(errorResponse.getResponse());
  }
}
