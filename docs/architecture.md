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

*   The application can be packaged as a Docker image.
*   It could be deployed on platforms like Kubernetes, AWS ECS, Google Cloud Run, or a traditional VPS.
*   A CI/CD pipeline will be needed to automate testing and deployments.

