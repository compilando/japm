# System Architecture - Prompt Management (JAPM)

## 1. Introduction

This document describes the high-level architecture of the Prompt Management system (JAPM). The primary goal of the system is to enable the creation, management, versioning, and translation of "prompts" that can be used by other applications or services.

## 2. Architectural Goals

*   **Scalability**: The system must be capable of handling a growing number of prompts, versions, and translations.
*   **Maintainability**: The code must be modular, easy to understand, and modify.
*   **Flexibility**: Allow for the easy addition of new features or modification of existing ones.
*   **Performance**: Provide adequate response times for CRUD and query operations.
*   **Security**: Protect data and ensure that only authorized users can perform certain operations (user management is not detailed initially but is anticipated).

## 3. Architectural Overview

The system follows an N-tier architecture, implemented using the **NestJS** framework.

```
+-------------------+      +-----------------------+      +---------------------+
|      Clients      |----->|      API Gateway      |<---->|     Application     |
|  (UI, Services)   |      | (NestJS Application)  |      |    (NestJS Core)    |
+-------------------+      +-----------------------+      +----------+----------+
                                                            |                     |
                                                            v                     v
                                                +-------------------------+  +----------------------+
                                                |   Authentication Module |  | Prompt Management    |
                                                |      (Optional V1)      |  |        Module        |
                                                +-------------------------+  +----------+-----------+
                                                                                        |
                                                                                        v
                                                                            +----------------------+
                                                                            |      Database        |
                                                                            |  (e.g., PostgreSQL)  |
                                                                            +----------------------+
```

### 3.1. Main Components

*   **Clients (External)**:
    *   User interfaces (web, mobile) or other services that consume the JAPM API.
*   **API Gateway (NestJS Application)**:
    *   Single entry point for all client requests.
    *   Responsible for routing, DTO validation, and response serialization.
    *   Implemented as the main NestJS application.
*   **Prompt Management Module**:
    *   Core business logic related to prompts.
    *   **Controllers**: Expose API endpoints (e.g., `/prompts`, `/prompts/:id/versions`).
    *   **Services**: Contain business logic (creation, update, versioning, translation of prompts).
    *   **DTOs (Data Transfer Objects)**: Define the data structure for requests and responses (e.g., `CreatePromptVersionDto`).
    *   **Entities**: Models representing data stored in the database (e.g., `Prompt`, `PromptVersion`, `Translation`).
*   **Authentication/Authorization Module (Future Consideration)**:
    *   Responsible for verifying user identity and controlling access to resources.
    *   Could use JWT, OAuth2, or similar. (Not the initial focus but its need is foreseen).
*   **Database**:
    *   Persists application data (prompts, versions, translations, users if applicable).
    *   A relational database (like PostgreSQL for its robustness and relationship handling) or NoSQL (like MongoDB if schema flexibility is a priority) could be used. The final choice will depend on a more detailed analysis of access and query patterns.

### 3.2. Typical Data Flow (Example: Create New Prompt Version)

1.  The **Client** sends a `POST` request to `/prompts/{promptId}/versions` with the new version data (text, tag, change message, initial translations) in the body, conforming to `CreatePromptVersionDto`.
2.  The **NestJS Application (API Gateway)** receives the request.
3.  The NestJS `ValidationPipe` validates the DTO. If there are errors, it returns a 400 response.
4.  The request is routed to the corresponding method in the `PromptController`.
5.  The `PromptController` calls the appropriate method in the `PromptService`, passing the validated data.
6.  The `PromptService` executes the business logic:
    *   Verifies that `promptId` exists.
    *   Verifies that `versionTag` is unique for that prompt.
    *   Creates the new `PromptVersion` entity and associated `Translation` entities.
    *   Saves the new entities to the **Database** (via an ORM like TypeORM or a database client).
7.  The `PromptService` returns the created version data (or a confirmation) to the `PromptController`.
8.  The `PromptController` returns an HTTP response (e.g., 201 Created) to the **Client**, possibly with the created entity in the body.

## 4. Key Technology Decisions

*   **Backend Framework**: NestJS (TypeScript) - For its modular architecture, TypeScript support, scalability, and ecosystem.
*   **Language**: TypeScript - For static typing, better maintainability, and developer tooling.
*   **Database**: Multi database with Prisma (Potentially MySQL, PostgreSQL and SQLite for development).
*   **Data Validation**: `class-validator` and `class-transformer` (integrated with NestJS).
*   **API**: RESTful.
*   **API Documentation**: Swagger (OpenAPI) via `@nestjs/swagger`.

## 5. Deployment Considerations

### 5.1. Development Environment

*   The application runs locally using SQLite database
*   Hot reload enabled for rapid development
*   Use `npm run start:dev` or `./run_dev.sh`

### 5.2. Production Environment

#### Docker Containerization

The application is containerized using Docker for consistent deployment across environments:

**Docker Images:**
- `Dockerfile`: Standard production image with SQLite (current default)
- `Dockerfile.production`: Optimized production image with MySQL support
- `Dockerfile.dev`: Development image with hot reload

**Key Features:**
- Multi-stage builds for optimized image size
- Non-root user for security
- Automatic Prisma migrations on startup
- Health checks built-in
- Support for external MySQL databases

#### Production Deployment Options

**Option 1: Docker Compose (Recommended for single-server deployments)**

```bash
# Basic production deployment with MySQL
./deploy-production.sh start

# With monitoring (Prometheus + Grafana)
./deploy-production.sh start --monitoring

# Build and deploy
./build-docker.sh --production --tag 1.0.0
./deploy-production.sh build
```

**Option 2: Kubernetes (Recommended for scalable production)**

For Kubernetes deployment, see detailed documentation in `docs/deployment.md`.

Key Kubernetes components:
- **Deployment**: 3+ replicas for high availability
- **Service**: ClusterIP for internal communication
- **Ingress**: External access with SSL termination
- **ConfigMap**: Non-sensitive configuration
- **Secret**: Database credentials and API keys
- **PVC**: Persistent storage for uploads
- **HPA**: Horizontal Pod Autoscaler for scaling

#### Database Configuration

**Development:**
- SQLite database (`file:./prisma/japm.db`)
- Embedded in the application
- Perfect for development and testing

**Production:**
- MySQL 8.0+ (external database)
- Connection pooling via Prisma
- SSL encryption enabled
- Automatic migrations on deployment

#### Environment-Specific Configurations

**Local Development:**
```env
DATABASE_URL="file:./prisma/japm.db"
NODE_ENV=development
AUTO_SEED=true
```

**Production:**
```env
DATABASE_URL="mysql://user:pass@mysql-host:3306/japm?ssl=true"
NODE_ENV=production
AUTO_SEED=false
SKIP_SEED=true
```

#### Build and Deployment Scripts

**Available Scripts:**
- `./build-docker.sh`: Advanced Docker image builder
- `./deploy-production.sh`: Production deployment manager
- `./run_docker.sh`: Development Docker manager
- `./init_db.sh`: Database initialization

**Build Process:**
1. Clone repository
2. Configure environment variables
3. Build Docker image using `./build-docker.sh --production`
4. Push to container registry
5. Deploy to Kubernetes or Docker Compose

#### Infrastructure Requirements

**Minimum Production Setup:**
- **Kubernetes**: 2 nodes, 4 CPU, 8GB RAM each
- **MySQL**: 2GB storage, backup strategy
- **Container Registry**: Docker Hub, AWS ECR, etc.
- **Load Balancer**: Nginx Ingress Controller
- **Monitoring**: Optional Prometheus + Grafana

#### Security Considerations

- Non-root container execution
- Secrets management via Kubernetes Secrets
- Network policies for traffic restriction
- Image vulnerability scanning
- SSL/TLS termination at ingress level
- JWT-based authentication

#### Scalability Features

- Horizontal Pod Autoscaler (HPA)
- Database connection pooling
- Redis caching layer (optional)
- CDN for static assets
- Multi-region deployment capability

#### Monitoring and Observability

- Health check endpoints (`/health`)
- Structured logging with configurable levels
- Prometheus metrics (optional)
- Grafana dashboards (optional)
- Error tracking with Sentry (configurable)

### 5.3. Deployment Workflow

1. **Preparation**
   - Set up external MySQL database
   - Configure container registry access
   - Prepare Kubernetes cluster

2. **Build Phase**
   ```bash
   ./build-docker.sh --production --tag 1.0.0 --registry your-registry.com --push
   ```

3. **Deploy Phase**
   ```bash
   # For Kubernetes
   kubectl apply -f k8s/
   
   # For Docker Compose
   ./deploy-production.sh start
   ```

4. **Verification**
   ```bash
   curl https://api.your-domain.com/health
   ```

5. **Monitoring**
   - Check application logs
   - Verify database connectivity
   - Monitor resource usage

For detailed deployment instructions, see `docs/deployment.md`.

