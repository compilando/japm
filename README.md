# JAPM (Just Another Prompt Manager)

A robust, scalable, and secure prompt management system designed for multi-tenant environments. JAPM helps organizations manage, version, and deploy AI prompts efficiently across different projects and regions.

## Features

- **Multi-tenant Architecture**: Secure isolation between different organizations.
- **Project-based Organization**: Group prompts by projects for better management.
- **Version Control**: Track and manage different versions of prompts.
- **Regional Support**: Deploy prompts with region-specific configurations.
- **Role-based Access Control**: Fine-grained permissions for different user roles.
- **API-first Design**: RESTful API for seamless integration with other systems.
- **Swagger Documentation**: Interactive API documentation for easy testing and integration.

## Tech Stack

- **Backend**: NestJS
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT-based authentication
- **API Documentation**: Swagger/OpenAPI
- **Caching**: In-memory caching for improved performance

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- PostgreSQL
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/japm.git
   cd japm
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your database and other configuration settings.

4. Run database migrations:
   ```bash
   npx prisma migrate dev
   ```

5. Seed the database (optional):
   ```bash
   npm run seed:all
   ```

6. Start the development server:
   ```bash
   npm run start:dev
   ```

The API will be available at `http://localhost:3001`.

## API Documentation

Access the Swagger documentation at `http://localhost:3001/api` to explore and test the API endpoints.

## Project Structure

- `src/`: Source code
  - `auth/`: Authentication and authorization
  - `project/`: Project management
  - `prompt/`: Prompt management
  - `tenant/`: Tenant management
  - `region/`: Regional configurations
- `prisma/`: Database schema and migrations
- `docs/`: Additional documentation

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contact

Your Name - your.email@example.com

Project Link: [https://github.com/yourusername/japm](https://github.com/yourusername/japm)
