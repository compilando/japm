import { CanActivate, ExecutionContext, Injectable, NotFoundException, BadRequestException, ForbiddenException, UnauthorizedException, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service'; // Ajusta la ruta si es necesario
// import { validate as isUuid } from 'uuid'; // O usa class-validator si prefieres
// Asumiendo CUIDs para IDs de proyecto

@Injectable()
export class ProjectGuard implements CanActivate {
    private readonly logger = new Logger(ProjectGuard.name); // Initialize logger
    constructor(private prisma: PrismaService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const projectId = request.params.projectId;
        const user = request.user; // User object from JwtStrategy: { userId: string, email: string }

        this.logger.log(`ProjectGuard activated for path: ${request.path}`);
        this.logger.debug(`Received projectId: ${projectId}`);
        // Log user object carefully, avoid logging sensitive data if present
        this.logger.debug(`User object from request: ${JSON.stringify(user, null, 2)}`);

        // 1. Check if user is authenticated (using userId)
        if (!user || !user.userId) { // Check for userId instead of id
            this.logger.warn(`Authentication check failed: User object or user.userId is missing.`);
            throw new UnauthorizedException('User not authenticated or token payload is invalid'); // Slightly more specific message
        }
        this.logger.log(`User authenticated: ${user.userId}`); // Log userId

        // 2. Validate projectId presence and basic format
        if (!projectId) {
            this.logger.warn('Project ID missing in URL parameters.');
            throw new BadRequestException('Project ID parameter is missing in URL');
        }
        if (typeof projectId !== 'string' || projectId.trim() === '') {
            this.logger.warn(`Invalid Project ID format received: ${projectId}`);
            throw new BadRequestException('Invalid Project ID format');
        }
        this.logger.log(`Project ID format validated: ${projectId}`);

        // 3. Fetch project and check ownership
        try {
            this.logger.debug(`Attempting to fetch project ID: ${projectId}`);
            const project = await this.prisma.project.findUnique({
                where: { id: projectId },
                select: { id: true, ownerUserId: true }, // Select ownerUserId to check ownership
            });

            // 4. Check if project exists
            if (!project) {
                this.logger.warn(`Project not found for ID: ${projectId}`);
                throw new NotFoundException(`Project with ID "${projectId}" not found`);
            }
            this.logger.log(`Project found: ${project.id}`);

            // 5. Check if the authenticated user owns the project (using userId)
            this.logger.debug(`Checking ownership: Project Owner=${project.ownerUserId}, Request User=${user.userId}`);
            if (project.ownerUserId !== user.userId) { // Compare ownerUserId with user.userId
                this.logger.warn(`Authorization failed: User ${user.userId} does not own project ${projectId} (Owner: ${project.ownerUserId}).`);
                throw new ForbiddenException('User does not have permission to access this project');
            }
            this.logger.log(`Ownership confirmed for user ${user.userId} on project ${projectId}.`);

            // 6. Attach validated projectId to request and allow access
            request.projectId = projectId;
            this.logger.log(`ProjectGuard passed for user ${user.userId} on project ${projectId}.`);
            return true;
        } catch (error) {
            // Log before re-throwing known exceptions
            if (error instanceof NotFoundException ||
                error instanceof BadRequestException ||
                error instanceof ForbiddenException ||
                error instanceof UnauthorizedException) {
                this.logger.error(`ProjectGuard failed with known HTTP error: ${error.message}`);
                throw error;
            }

            // Log unexpected errors
            this.logger.error(`Unexpected error in ProjectGuard for projectId ${projectId} and userId ${user.userId}:`, error.stack || error); // Use user.userId in log
            // Throw a generic internal server error
            throw new Error('An internal error occurred while authorizing project access.'); // Avoid exposing details
        }
    }
} 