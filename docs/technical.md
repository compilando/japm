# Technical Documentation - Prompt Management (JAPM)

## 1. Introduction

This document provides more specific technical details about the Prompt Management system (JAPM). It complements the architecture document and the PRD, focusing on implementation aspects, API design, data structure, and other technical considerations.

## 2. Development Environment

*   **Language**: TypeScript (~5.x)
*   **Framework**: NestJS (~10.x)
*   **Package Manager**: npm or yarn
*   **Node.js**: LTS (e.g., v18.x or v20.x)
*   **Version Control**: Git
*   **Database (Local Development)**: Dockerized (e.g., PostgreSQL, MongoDB)
*   **Linting**: ESLint
*   **Formatting**: Prettier
*   **Development Port**: 3001 (NestJS API Server)
*   **Frontend Port**: 3000 (Next.js Frontend)

### 2.4. Initial Project Setup

```bash
# Install NestJS CLI (if not already installed)
npm install -g @nestjs/cli

# Create a new NestJS project (if starting from scratch)
nest new japm-prompt-service

cd japm-prompt-service

# Install additional dependencies
npm install @nestjs/swagger swagger-ui-express class-validator class-transformer
npm install @nestjs/config # For configuration management
# npm install @nestjs/typeorm typeorm pg # Example for PostgreSQL with TypeORM
# npm install @nestjs/mongoose mongoose # Example for MongoDB with Mongoose
```

### 2.2. Development Server

En desarrollo, el servidor de NestJS corre en el puerto **3001**, mientras que el frontend de Next.js corre en el puerto **3000**.

Para iniciar el servidor de desarrollo:

```bash
# Inicio del servidor backend (NestJS) en puerto 3001
npm run start:dev

# Verificar que el servidor está corriendo
curl http://localhost:3001/api/health
```

### 2.3. Autenticación en Desarrollo

Para realizar peticiones autenticadas a la API durante el desarrollo, sigue estos pasos:

#### 1. Obtener Token JWT

```bash
# Obtener token de autenticación usando las credenciales de prueba
curl -X POST "http://localhost:3001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

**Respuesta esperada:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 2. Usar Token en Peticiones

```bash
# Ejemplo de petición autenticada
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -X GET "http://localhost:3001/api/projects/codegen-examples/prompts"
```

#### 3. Ejemplos de Endpoints Comunes

```bash
# Variables de ejemplo para facilitar testing
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
export BASE_URL="http://localhost:3001/api"

# Listar prompts de un proyecto
curl -H "Authorization: Bearer $TOKEN" \
  -X GET "$BASE_URL/projects/codegen-examples/prompts"

# Obtener versión de prompt procesada (con referencias resueltas)
curl -H "Authorization: Bearer $TOKEN" \
  -X GET "$BASE_URL/projects/codegen-examples/prompts/user-code-request/versions/latest?processed=true"

# Ejecutar prompt con variables
curl -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -X POST "$BASE_URL/serve-prompt/execute/codegen-examples/user-code-request/latest/base" \
  -d '{"variables": {"userInput": "Crear una función para sumar números"}}'
```

#### 4. Renovación de Token

Los tokens JWT tienen una expiración limitada. Si recibes un error `401 Unauthorized`, necesitas obtener un nuevo token:

```bash
# El token expira, obtener uno nuevo
curl -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'
```

## 3. API Design (RESTful)

The API will be documented using OpenAPI (Swagger) via `@nestjs/swagger`.

### 3.1. Main Endpoints (MVP)

#### Prompts

*   **`POST /prompts`**: Create a new prompt.
    *   **Request Body**: `CreatePromptDto` (to be defined, could include name, description, and optionally the first version).
    *   **Response**: `201 Created` - Prompt created.
*   **`GET /prompts`**: Get a list of prompts (with pagination).
    *   **Response**: `200 OK` - List of prompts.
*   **`GET /prompts/{promptId}`**: Get details of a prompt.
    *   **Response**: `200 OK` - Prompt details.
*   **`PUT /prompts/{promptId}`**: Update a prompt.
    *   **Request Body**: `UpdatePromptDto` (to be defined).
    *   **Response**: `200 OK` - Prompt updated.
*   **`DELETE /prompts/{promptId}`**: Delete a prompt.
    *   **Response**: `204 No Content`.

#### Prompt Versions

*   **`POST /prompts/{promptId}/versions`**: Create a new version for a prompt.
    *   **Request Body**: `CreatePromptVersionDto` (as per the provided file).
        ```typescript
        // CreatePromptVersionDto Example
        {
          "promptText": "This is the new prompt text for this version.",
          "versionTag": "v1.1.0",
          "changeMessage": "Improved clarity and added example.",
          "initialTranslations": [
            { "languageCode": "en-US", "promptText": "This is the new prompt text for this version." }
          ]
        }
        ```
    *   **Response**: `201 Created` - Version created.
*   **`GET /prompts/{promptId}/versions`**: Get all versions of a prompt (with pagination).
    *   **Response**: `200 OK` - List of versions.
*   **`GET /prompts/{promptId}/versions/{versionTag}`**: Get details of a specific version.
    *   **Response**: `200 OK` - Version details.
    *   *Note: Consider using a version ID instead of `versionTag` in the URL if `versionTag` is not strictly unique system-wide or if it might change (although the PRD suggests it as an identifier).*

#### Prompt Version Translations

*   **`POST /prompts/{promptId}/versions/{versionTag}/translations`**: Add/Update a translation.
    *   **Request Body**: `CreateOrUpdateTranslationDto` (to be defined, similar to `InitialTranslationDto`).
        ```typescript
        // CreateOrUpdateTranslationDto Example
        {
          "languageCode": "fr-FR",
          "promptText": "Ceci est le nouveau texte du prompt pour cette version en français."
        }
        ```
    *   **Response**: `201 Created` or `200 OK` - Translation created/updated.
*   **`GET /prompts/{promptId}/versions/{versionTag}/translations`**: Get all translations for a version.
    *   **Response**: `200 OK` - List of translations.
*   **`GET /prompts/{promptId}/versions/{versionTag}/translations/{languageCode}`**: Get a specific translation.
    *   **Response**: `200 OK` - Translation.
*   **`DELETE /prompts/{promptId}/versions/{versionTag}/translations/{languageCode}`**: Delete a translation.
    *   **Response**: `204 No Content`.

#### Get Translated Prompt (Convenience Endpoint)

*   **`GET /prompts/render/{promptNameOrId}/versions/{versionTag}?lang={languageCode}`**: Get the text of a prompt in a specific language and version.
    *   **Query Params**: `lang` (language code).
    *   **Response**: `200 OK` - `{ "promptText": "Translated text" }` or a fallback.
    *   *Consider how to identify `promptNameOrId` (slug, unique name?)*

### 3.2. Authentication and Authorization

*   Initially, the API might be open or protected by a simple API key.
*   For future versions, a JWT (JSON Web Tokens) based system will be implemented:
    *   `/auth/login` endpoint to obtain a token.
    *   Tokens will be sent in the `Authorization: Bearer <token>` header.
    *   NestJS Guards will be used to protect endpoints.

## 4. Data Structure (Database)

The detailed database schema, including table/collection definitions, fields, relationships, and constraints, will be maintained in the chosen ORM's schema definition files.
*   If using **TypeORM**, refer to the entity definitions in `src/**/*.entity.ts`.
*   If using **Prisma**, refer to the `prisma/schema.prisma` file.
*   If using **Mongoose**, refer to the schema definitions in `src/**/*.schema.ts`.

Key entities will include:
*   `Prompt`
*   `PromptVersion`
*   `PromptTranslation`

Appropriate indexes will be defined within the schema files to optimize query performance (e.g., on prompt names, version tags, language codes).

## 5. Data Validation

*   DTOs (Data Transfer Objects) with `class-validator` decorators will be used for all endpoints accepting input data.
*   A global NestJS `ValidationPipe` will ensure all incoming data is validated.
*   Example (from `CreatePromptVersionDto`):
    ```typescript
    import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
    import { IsString, IsOptional, IsArray, ValidateNested, IsDefined, Length } from 'class-validator';
    import { Type } from 'class-transformer';

    class InitialTranslationDto {
      @ApiProperty({ description: 'Language code (e.g., en-US).', example: 'en-US' })
      @IsString()
      @Length(2, 10)
      languageCode: string;

      @ApiProperty({ description: 'Translated prompt text for this version.' })
      @IsString()
      @IsDefined()
      promptText: string;
    }

    export class CreatePromptVersionDto {
      @ApiProperty({ description: 'The prompt text for this new version' })
      @IsString()
      promptText: string;

      @ApiProperty({ description: 'Version tag for this new version...\', example: '1.0.0' })
      @IsString()
      @Length(1, 50)
      versionTag: string;

      // ... other fields ...
    }
    ```

## 6. Configuration Management

*   The `@nestjs/config` module will be used.
*   Configurations will be loaded from `.env` files (different for development, staging, production).
*   Example environment variables:
    *   `DATABASE_URL`
    *   `PORT`
    *   `JWT_SECRET` (for the future)
    *   `LOG_LEVEL`

## 7. Logging and Monitoring

*   NestJS provides a built-in logger, which can be extended or replaced (e.g., with Winston or Pino).
*   Important events, errors, and requests should be logged.
*   For monitoring, tools like Prometheus/Grafana or cloud services (CloudWatch, Datadog) could be integrated.

## 8. Testing

*   **Unit Tests**: With Jest. Each service and controller should have unit tests.
*   **Integration Tests**: Test the interaction between several components (e.g., controller -> service -> mocked database).
*   **E2E (End-to-End) Tests**: With Jest and Supertest. Test the complete API flows.

## 9. Contribution Workflow (Suggested)

1.  Create/assign an issue in the tracker.
2.  Create a new feature branch from `develop` or `main`.
3.  Implement the feature/fix.
4.  Write/update tests.
5.  Ensure all tests and linters pass.
6.  Make a Pull Request (PR) to the `develop` branch.
7.  Code review by at least one other team member.
8.  Merge the PR.

## 10. Database Initialization

To initialize the database, apply all migrations and execute the seed, use the standard script:

```bash
./init_db.sh
```

This script executes:
- Prisma migrations to create or update the database schema.
- Prisma client generation.
- Seed to populate the database with initial data.

> **Note:** If there are changes in the Prisma schema, make sure to run this script to keep the database synchronized and avoid migration or seed errors. 