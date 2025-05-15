import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service'; // Corrected path assuming standard structure
import { Reflector } from '@nestjs/core'; // Import Reflector
// import { validate as isUuid } from 'uuid'; // O usa class-validator si prefieres
// Asumiendo CUIDs para IDs de proyecto

export const PROJECT_ID_PARAM_KEY = 'projectIdParam'; // Key for metadata

@Injectable()
export class ProjectGuard implements CanActivate {
  private readonly logger = new Logger(ProjectGuard.name); // Initialize logger
  constructor(
    private prisma: PrismaService,
    private reflector: Reflector,
  ) {} // Inject Reflector

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Get the custom param name from metadata, default to 'projectId'
    const projectIdParamName =
      this.reflector.getAllAndOverride<string>(PROJECT_ID_PARAM_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || 'projectId';

    const projectId = request.params[projectIdParamName]; // Use dynamic param name
    const user = request.user; // User object from JwtStrategy: { userId: string, email: string }

    // this.logger.log(`ProjectGuard activated for path: ${request.path}`);
    // this.logger.debug(`Received projectId: ${projectId}`);
    // Log user object carefully, avoid logging sensitive data if present
    // this.logger.debug(`User object from request: ${JSON.stringify(user, null, 2)}`);

    // 1. Check if user is authenticated (using userId)
    if (!user || !user.userId) {
      // Check for userId instead of id
      this.logger.warn(
        `Authentication check failed: User object or user.userId is missing.`,
      );
      throw new UnauthorizedException(
        'User not authenticated or token payload is invalid',
      ); // Slightly more specific message
    }
    //this.logger.debug(`User authenticated: ${user.userId}`); // Log userId

    // 2. Validate projectId presence and basic format
    if (!projectId) {
      this.logger.warn(
        `Project ID missing in URL parameters (expected param: ${projectIdParamName}).`,
      );
      throw new BadRequestException(
        `Project ID parameter (expected: ${projectIdParamName}) is missing in URL`,
      );
    }
    if (typeof projectId !== 'string' || projectId.trim() === '') {
      this.logger.warn(
        `Invalid Project ID format received (param: ${projectIdParamName}): ${projectId}`,
      );
      throw new BadRequestException('Invalid Project ID format');
    }
    //this.logger.debug(`Project ID format validated: ${projectId}`);

    // 3. Fetch project and check ownership
    try {
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true, ownerUserId: true }, // Select ownerUserId to check ownership
      });

      // 4. Check if project exists
      if (!project) {
        this.logger.warn(
          `Project not found for ID (param: ${projectIdParamName}): ${projectId}`,
        );
        throw new NotFoundException(
          `Project with ID "${projectId}" (from param "${projectIdParamName}") not found`,
        );
      }

      // 5. Check if the authenticated user owns the project (using userId)
      // this.logger.debug(`Checking ownership: Project Owner=${project.ownerUserId}, Request User=${user.userId}`);
      if (project.ownerUserId !== user.userId) {
        // Compare ownerUserId with user.userId
        this.logger.warn(
          `Authorization failed: User ${user.userId} does not own project ${projectId} (Owner: ${project.ownerUserId}). Param: ${projectIdParamName}`,
        );
        throw new ForbiddenException(
          'User does not have permission to access this project',
        );
      }
      //this.logger.debug(`Ownership confirmed for user ${user.userId} on project ${projectId}.`);

      // 6. Attach validated projectId to request (using the original dynamic key for clarity if needed, or a fixed key like 'validatedProjectId')
      // request.projectId = projectId; // Keep this simple, the controller now uses @Param directly for new routes
      request[projectIdParamName] = projectId; // Or set it dynamically if other parts rely on this specific key
      request.validatedProjectId = projectId; // A new, consistently named property

      return true;
    } catch (error) {
      // Log before re-throwing known exceptions
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ForbiddenException ||
        error instanceof UnauthorizedException
      ) {
        this.logger.error(
          `ProjectGuard failed with known HTTP error: ${error.message}`,
        );
        throw error;
      }

      // Log unexpected errors
      this.logger.error(
        `Unexpected error in ProjectGuard for projectId ${projectId} (param: ${projectIdParamName}) and userId ${user.userId}:`,
        error.stack || error,
      ); // Use user.userId in log
      // Throw a generic internal server error
      throw new InternalServerErrorException(
        'An internal error occurred while authorizing project access.',
      ); // Use NestJS exception
    }
  }
}
