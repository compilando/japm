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
- **Multiple Database Support**: SQLite, MySQL, and PostgreSQL compatibility.
- **Docker & Kubernetes Ready**: Production-ready containerization and orchestration.

## Tech Stack

- **Backend**: NestJS
- **Database**: SQLite (development), MySQL/PostgreSQL (production) with Prisma ORM
- **Authentication**: JWT-based authentication
- **API Documentation**: Swagger/OpenAPI
- **Caching**: In-memory caching for improved performance
- **Containerization**: Docker with multi-stage builds
- **Orchestration**: Kubernetes support with Helm charts

## Database Options

JAPM supports multiple database systems to fit different deployment scenarios:

### 🧪 SQLite (Current - Development)
- **Ideal for**: Local development, testing, prototyping
- **Pros**: Zero configuration, single file database, perfect for getting started
- **Cons**: Not suitable for production with multiple users

### 🏭 MySQL (Production)
- **Ideal for**: Web applications, standard production deployments
- **Pros**: Widely supported, excellent for OLTP workloads, great ecosystem
- **Setup**: See [Database Configuration Guide](docs/DATABASE.md#mysql)

### 🚀 PostgreSQL (Recommended for Production)
- **Ideal for**: Complex applications, enterprise environments
- **Pros**: Advanced features, JSON support, excellent for analytics, ACID compliant
- **Setup**: See [Database Configuration Guide](docs/DATABASE.md#postgresql)

For detailed database setup instructions, see our [Database Configuration Guide](docs/DATABASE.md).

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Database system of choice (SQLite included by default)
- npm, yarn, or pnpm
- Docker (optional, for containerized deployment)

### Quick Start (SQLite)

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/japm.git
   cd japm
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   pnpm install
   ```

3. Set up environment variables:
   ```bash
   cp env.example .env
   ```

4. Initialize database:
   ```bash
   ./init_db.sh
   ```

5. Start the development server:
   ```bash
   npm run start:dev
   ```

The API will be available at `http://localhost:3001`.

### Production Setup

For production deployment with MySQL or PostgreSQL:

1. **Choose your database** and set it up according to the [Database Guide](docs/DATABASE.md)

2. **Migrate from SQLite** (if needed):
   ```bash
   ./scripts/migrate_db.sh mysql
   # or
   ./scripts/migrate_db.sh postgresql
   ```

3. **Update environment variables** with your production database URL

4. **Deploy** using your preferred method (Docker, Kubernetes, PM2, etc.)

## API Documentation

Access the interactive API documentation:
- **Swagger UI**: `http://localhost:3001/api/docs`
- **Health Check**: `http://localhost:3001/health`

## Database Migration

Switch between database systems easily:

```bash
# Migrate to MySQL
./scripts/migrate_db.sh mysql

# Migrate to PostgreSQL  
./scripts/migrate_db.sh postgresql

# Back to SQLite for development
./scripts/migrate_db.sh sqlite

# Create backup only
./scripts/migrate_db.sh --backup-only
```

## Project Structure

```
japm/
├── src/                     # Source code
│   ├── auth/               # Authentication and authorization
│   ├── llm-execution/      # LLM execution and prompt processing
│   ├── project/            # Project management
│   ├── prompt/             # Prompt management
│   ├── serve-prompt/       # Prompt serving and resolution
│   ├── tenant/             # Tenant management
│   └── region/             # Regional configurations
├── prisma/                 # Database schema and migrations
│   ├── schema.prisma       # Database schema
│   ├── migrations/         # Database migrations
│   └── *.db               # SQLite database files
├── seed/                   # Database seeding scripts
├── scripts/                # Utility scripts
│   └── migrate_db.sh       # Database migration script
├── docs/                   # Documentation
│   ├── DATABASE.md         # Database configuration guide
│   └── deployment.md       # Production deployment guide
├── k8s/                    # Kubernetes manifests
├── Dockerfile              # Standard Docker image
├── Dockerfile.production   # Optimized production image
├── docker-compose.production.yml  # Production compose
└── README.md               # This file
```

## Environment Configuration

Key environment variables:

```bash
# Database
DATABASE_URL="file:./prisma/japm.db"  # SQLite
# DATABASE_URL="mysql://user:pass@localhost:3306/japm"  # MySQL
# DATABASE_URL="postgresql://user:pass@localhost:5432/japm"  # PostgreSQL

# Application
PORT=3001
NODE_ENV=development
JWT_SECRET=your_secure_secret

# AI Models
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key

# Regional
DEFAULT_LANGUAGE_CODE=es-ES

# Production specific
AUTO_SEED=false
SKIP_SEED=true
LOG_LEVEL=info
```

See `env.example` for complete configuration options.

## Development Commands

```bash
# Development
npm run start:dev          # Start in watch mode
npm run build              # Build for production
npm run start:prod         # Start production build

# Database
./init_db.sh               # Initialize database and seed data
npm run seed:all           # Run all seed scripts
npx prisma studio          # Database visual editor
npx prisma migrate dev     # Create and apply migration

# Testing
npm run test               # Run unit tests
npm run test:e2e          # Run end-to-end tests
npm run test:cov          # Run tests with coverage

# Linting
npm run lint              # Check code style
npm run format            # Format code
```

## Docker Support

### Development with Docker

```bash
# Quick start with Docker Compose
./run_docker.sh dev

# Or manually
docker-compose up -d japm-dev
```

### Production Deployment

#### Option 1: Docker Compose (Single Server)

```bash
# Build and deploy production stack
./deploy-production.sh start

# With monitoring
./deploy-production.sh start --monitoring

# View logs
./deploy-production.sh logs japm-api

# Backup database
./deploy-production.sh backup
```

#### Option 2: Kubernetes (Scalable Production)

```bash
# Build production image
./build-docker.sh --production --tag 1.0.0 --registry your-registry.com --push

# Deploy to Kubernetes
kubectl apply -f k8s/

# Check deployment
kubectl get pods -n japm
kubectl logs -f deployment/japm-api -n japm
```

### Available Docker Scripts

- `./build-docker.sh`: Advanced Docker image builder with multi-arch support
- `./deploy-production.sh`: Production deployment manager
- `./run_docker.sh`: Development Docker manager

### Docker Images

- **Dockerfile**: Standard image with SQLite (development)
- **Dockerfile.production**: Optimized image with MySQL support (production)
- **Dockerfile.dev**: Development image with hot reload

## Production Deployment

### Recommended Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │   Kubernetes    │    │   External      │
│    (Ingress)    │────│     Cluster     │────│   MySQL DB      │
│                 │    │   (JAPM Pods)   │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                       ┌─────────────────┐
                       │      Redis      │
                       │     (Cache)     │
                       └─────────────────┘
```

### Deployment Options

1. **Docker Compose**: Perfect for single-server deployments
2. **Kubernetes**: Recommended for scalable, production environments
3. **Traditional**: Direct deployment with PM2 or similar

### Infrastructure Requirements

**Minimum Production Setup:**
- **Kubernetes**: 2 nodes, 4 CPU, 8GB RAM each
- **MySQL**: 2GB storage, backup strategy
- **Container Registry**: Docker Hub, AWS ECR, etc.
- **Load Balancer**: Nginx Ingress Controller

### Deployment Checklist

- [ ] Choose and configure production database (MySQL/PostgreSQL)
- [ ] Set secure `JWT_SECRET`
- [ ] Configure SSL/TLS
- [ ] Set up database backups
- [ ] Configure monitoring and logging
- [ ] Set up CI/CD pipeline
- [ ] Configure environment variables
- [ ] Test database migration scripts
- [ ] Set up health checks
- [ ] Configure container registry access
- [ ] Set up Kubernetes cluster (if using K8s)

For detailed deployment instructions, see [docs/deployment.md](docs/deployment.md).

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Choose appropriate database for your development
4. Make your changes and add tests
5. Ensure all tests pass (`npm test`)
6. Commit your changes (`git commit -m 'Add some amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

### Development Guidelines

- Use SQLite for local development unless testing database-specific features
- Follow the existing code style (run `npm run lint`)
- Add tests for new features
- Update documentation as needed
- Test migrations between database systems if making schema changes
- Test Docker builds before submitting PRs

## Troubleshooting

### Common Issues

1. **Database connection errors**: Check your `DATABASE_URL` in `.env`
2. **Migration errors**: Try `npx prisma migrate reset` to start fresh
3. **Port conflicts**: Change `PORT` in `.env` or kill processes using port 3001
4. **Missing API keys**: Set `OPENAI_API_KEY` for LLM functionality
5. **Docker build issues**: Ensure Docker is running and has sufficient resources
6. **Kubernetes deployment issues**: Check pod logs and resource limits

### Getting Help

- Check the [Database Configuration Guide](docs/DATABASE.md)
- Review [Deployment Guide](docs/deployment.md) for production issues
- Review logs for detailed error information
- Ensure all environment variables are properly set
- Verify database connectivity independently

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contact

Your Name - your.email@example.com

Project Link: [https://github.com/yourusername/japm](https://github.com/yourusername/japm)
