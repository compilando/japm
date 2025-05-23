# Database Configuration - JAPM

This document provides detailed instructions for configuring JAPM with different database management systems.

## Table of Contents

- [General Configuration](#general-configuration)
- [SQLite (Development)](#sqlite-development)
- [MySQL](#mysql)
- [PostgreSQL](#postgresql)
- [Database Migration](#database-migration)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)

## General Configuration

JAPM uses Prisma as ORM, which allows easily switching between different database providers. The configuration is located in:

- **Schema**: `prisma/schema.prisma`
- **Migrations**: `prisma/migrations/`
- **Environment variables**: `.env`

## SQLite (Development)

### ✅ Current Configuration

SQLite is ideal for local development and testing due to its simplicity.

#### Schema Configuration

```prisma
// prisma/schema.prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

#### Environment Variables

```bash
# .env
DATABASE_URL="file:./prisma/japm.db"
```

#### Installation and Setup

```bash
# 1. Ensure the schema is configured for SQLite
# 2. Run migrations
npx prisma migrate dev --name init

# 3. Generate Prisma client
npx prisma generate

# 4. Seed data (optional)
npm run seed:all
```

#### SQLite Advantages
- ✅ No server installation required
- ✅ Single file easy to backup
- ✅ Perfect for development and testing
- ✅ Minimal configuration

#### SQLite Disadvantages
- ❌ Not suitable for production with multiple users
- ❌ No support for concurrent connections
- ❌ Limitations in advanced data types

## MySQL

### 🆕 New Configuration

MySQL is excellent for production applications with standard needs.

#### 1. MySQL Installation

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install mysql-server mysql-client
sudo systemctl start mysql
sudo systemctl enable mysql
```

**CentOS/RHEL:**
```bash
sudo yum install mysql-server mysql
sudo systemctl start mysqld
sudo systemctl enable mysqld
```

**macOS (Homebrew):**
```bash
brew install mysql
brew services start mysql
```

**Windows:**
- Download MySQL Community Server from [mysql.com](https://dev.mysql.com/downloads/mysql/)
- Use MySQL Installer

**Docker:**
```bash
# Create MySQL container
docker run --name japm-mysql \
  -e MYSQL_ROOT_PASSWORD=your_secure_password \
  -e MYSQL_DATABASE=japm \
  -e MYSQL_USER=japm_user \
  -e MYSQL_PASSWORD=your_user_password \
  -p 3306:3306 \
  -d mysql:8.0

# Verify it's running
docker ps
```

#### 2. Database Configuration

```sql
-- Connect as root
mysql -u root -p

-- Create database and user
CREATE DATABASE japm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'japm_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON japm.* TO 'japm_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

#### 3. Modify Prisma Schema

```prisma
// prisma/schema.prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
```

#### 4. Environment Variables

```bash
# .env
DATABASE_URL="mysql://japm_user:your_secure_password@localhost:3306/japm"

# For SSL connection (recommended for production)
DATABASE_URL="mysql://japm_user:your_secure_password@localhost:3306/japm?ssl=true"

# For remote connection
DATABASE_URL="mysql://japm_user:your_secure_password@your-server.com:3306/japm"
```

#### 5. Migration from SQLite

```bash
# 1. Backup current data (optional)
sqlite3 prisma/japm.db ".dump" > backup_sqlite.sql

# 2. Reset Prisma migrations
rm -rf prisma/migrations/
rm prisma/migrations/migration_lock.toml

# 3. Create new migration for MySQL
npx prisma migrate dev --name init_mysql

# 4. Verify connection
npx prisma db push

# 5. Generate client
npx prisma generate

# 6. Re-seed data
npm run seed:all
```

#### MySQL Advanced Configuration

```sql
-- Recommended configuration for production
-- In /etc/mysql/mysql.conf.d/mysqld.cnf or /etc/my.cnf

[mysqld]
# Character configuration
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci

# Connection configuration
max_connections = 200
connect_timeout = 60
wait_timeout = 28800

# Memory configuration
innodb_buffer_pool_size = 1G
innodb_log_file_size = 256M

# Log configuration
log_error = /var/log/mysql/error.log
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 2
```

#### MySQL Advantages
- ✅ Excellent for web applications
- ✅ Large community and documentation
- ✅ Good performance for OLTP workloads
- ✅ Replication support
- ✅ Easy integration with development tools

## PostgreSQL

### 🚀 Recommended Configuration for Production

PostgreSQL is the best choice for complex enterprise applications.

#### 1. PostgreSQL Installation

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**CentOS/RHEL:**
```bash
sudo yum install postgresql-server postgresql-contrib
sudo postgresql-setup initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**macOS (Homebrew):**
```bash
brew install postgresql
brew services start postgresql
```

**Docker:**
```bash
# Create PostgreSQL container
docker run --name japm-postgres \
  -e POSTGRES_DB=japm \
  -e POSTGRES_USER=japm_user \
  -e POSTGRES_PASSWORD=your_secure_password \
  -p 5432:5432 \
  -v japm_postgres_data:/var/lib/postgresql/data \
  -d postgres:15

# Verify it's running
docker ps
```

#### 2. Database Configuration

```sql
-- Connect as postgres user
sudo -u postgres psql

-- Create database and user
CREATE DATABASE japm;
CREATE USER japm_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE japm TO japm_user;

-- Grant specific permissions
\c japm;
GRANT ALL ON SCHEMA public TO japm_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO japm_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO japm_user;

\q
```

#### 3. Modify Prisma Schema

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

#### 4. Environment Variables

```bash
# .env
DATABASE_URL="postgresql://japm_user:your_secure_password@localhost:5432/japm"

# For SSL connection (recommended for production)
DATABASE_URL="postgresql://japm_user:your_secure_password@localhost:5432/japm?sslmode=require"

# For remote connection
DATABASE_URL="postgresql://japm_user:your_secure_password@your-server.com:5432/japm"

# For connection with connection pooling
DATABASE_URL="postgresql://japm_user:your_secure_password@localhost:5432/japm?connection_limit=20&pool_timeout=20"
```

#### 5. Migration from SQLite/MySQL

```bash
# 1. Backup current data
# For SQLite:
sqlite3 prisma/japm.db ".dump" > backup_sqlite.sql
# For MySQL:
mysqldump -u japm_user -p japm > backup_mysql.sql

# 2. Reset Prisma migrations
rm -rf prisma/migrations/
rm prisma/migrations/migration_lock.toml

# 3. Create new migration for PostgreSQL
npx prisma migrate dev --name init_postgresql

# 4. Verify connection
npx prisma db push

# 5. Generate client
npx prisma generate

# 6. Re-seed data
npm run seed:all
```

#### PostgreSQL Advanced Configuration

```bash
# Recommended configuration for production
# In /etc/postgresql/15/main/postgresql.conf

# Memory configuration
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB

# Connection configuration
max_connections = 200

# Log configuration
log_statement = 'all'
log_duration = on
log_min_duration_statement = 1000

# Checkpoint configuration
checkpoint_segments = 32
checkpoint_completion_target = 0.9
```

#### PostgreSQL Advantages
- ✅ Full support for JSON and advanced data types
- ✅ Excellent for complex queries
- ✅ ACID compliant
- ✅ Powerful extensions (PostGIS, etc.)
- ✅ Better for analytical applications

## Environment Variables

### Complete .env File

```bash
# ================================
# DATABASE CONFIGURATION
# ================================

# SQLite (Development)
# DATABASE_URL="file:./prisma/japm.db"

# MySQL (Production)
# DATABASE_URL="mysql://japm_user:your_password@localhost:3306/japm"

# PostgreSQL (Recommended for Production)
DATABASE_URL="postgresql://japm_user:your_password@localhost:5432/japm"

# ================================
# APPLICATION CONFIGURATION
# ================================

# Server port
PORT=3001

# Runtime environment
NODE_ENV=development

# ================================
# AUTHENTICATION CONFIGURATION
# ================================

# JWT Secret (change in production)
JWT_SECRET=your_very_secure_jwt_secret

# JWT Expiration
JWT_EXPIRES_IN=24h

# ================================
# AI MODELS CONFIGURATION
# ================================

# OpenAI API Key
OPENAI_API_KEY=your_openai_api_key

# Anthropic API Key
ANTHROPIC_API_KEY=your_anthropic_api_key

# ================================
# LOGGING CONFIGURATION
# ================================

# Log Level
LOG_LEVEL=debug

# ================================
# REGIONAL CONFIGURATION
# ================================

# Default language
DEFAULT_LANGUAGE_CODE=en-US

# ================================
# CACHE CONFIGURATION
# ================================

# Cache TTL (seconds)
CACHE_TTL=300
```

### Environment Variables Validation

Create `src/config/env.validation.ts`:

```typescript
import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class EnvironmentVariables {
  @IsString()
  DATABASE_URL: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT?: number = 3001;

  @IsString()
  JWT_SECRET: string;

  @IsOptional()
  @IsString()
  OPENAI_API_KEY?: string;

  @IsOptional()
  @IsString()
  ANTHROPIC_API_KEY?: string;

  @IsOptional()
  @IsString()
  DEFAULT_LANGUAGE_CODE?: string = 'en-US';
}
```

## Troubleshooting

### Common Problems

#### 1. Database Connection Error

```bash
# Verify connectivity
# For MySQL:
mysql -u japm_user -p -h localhost

# For PostgreSQL:
psql -U japm_user -h localhost -d japm

# For SQLite:
sqlite3 prisma/japm.db ".tables"
```

#### 2. Migration Error

```bash
# Completely reset the database
npx prisma migrate reset

# Force synchronization
npx prisma db push --force-reset
```

#### 3. Permission Error

```sql
-- MySQL
GRANT ALL PRIVILEGES ON japm.* TO 'japm_user'@'localhost';
FLUSH PRIVILEGES;

-- PostgreSQL
GRANT ALL PRIVILEGES ON DATABASE japm TO japm_user;
GRANT ALL ON SCHEMA public TO japm_user;
```

#### 4. Prisma Client Error

```bash
# Regenerate client
npx prisma generate

# Clean and regenerate
rm -rf node_modules/.prisma
npx prisma generate
```

### Logs and Monitoring

#### Enable Prisma Logs

```bash
# Environment variables for debugging
DEBUG=prisma:query
PRISMA_LOG_LEVEL=info
```

#### Log Configuration in Code

```typescript
// src/prisma/prisma.service.ts
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});
```

### Performance and Optimization

#### Recommended Indexes

```sql
-- Additional indexes for better performance
CREATE INDEX idx_prompts_project_tenant ON prompts(projectId, tenantId);
CREATE INDEX idx_prompt_versions_status ON promptversions(status);
CREATE INDEX idx_execution_logs_created ON promptexecutionlogs(createdAt);

-- For PostgreSQL: GIN indexes for text searches
CREATE INDEX idx_prompts_content_gin ON prompts USING gin(to_tsvector('english', content));
```

#### Connection Pooling

```bash
# PostgreSQL with connection pooling
DATABASE_URL="postgresql://user:password@localhost:5432/japm?connection_limit=20&pool_timeout=20"

# MySQL with connection pooling
DATABASE_URL="mysql://user:password@localhost:3306/japm?connection_limit=20&pool_timeout=20"
```

## Environment Recommendations

### 🧪 Development
- **SQLite**: Ideal for local development
- No additional configuration
- Easy reset and testing

### 🚀 Staging
- **MySQL** or **PostgreSQL**
- Configuration similar to production
- Realistic test data

### 🏭 Production
- **PostgreSQL** (recommended)
- Automatic backup
- Monitoring and alerts
- Replicas for high availability
- SSL/TLS enabled

Your JAPM system can now run with any Prisma-compatible database! 