# Database Migration Instructions - JAPM

## Overview

This document contains instructions for applying the pending database migration that implements cascade delete relations for the JAPM system.

## Migration Details

**Migration Name**: `add-cascade-delete-relations`  
**Date Created**: 2025-05-24  
**Purpose**: Add cascade delete relations to PromptTranslation and AssetTranslation models

## Changes Included

### Schema Modifications

1. **PromptTranslation Model**:
   ```prisma
   version PromptVersion @relation("PromptTranslation_version", fields: [versionId], references: [id], onDelete: Cascade)
   ```

2. **AssetTranslation Model**:
   ```prisma
   version PromptAssetVersion @relation("AssetTranslation_version", fields: [versionId], references: [id], onDelete: Cascade)
   ```

### Impact

These changes enable automatic cleanup of translation records when their parent versions are deleted, maintaining database integrity and preventing orphaned records.

## Migration Commands

### Development Environment

```bash
# Navigate to project directory
cd /path/to/japm

# Generate and apply migration
npx prisma migrate dev --name add-cascade-delete-relations

# Verify migration status
npx prisma migrate status
```

### Production Environment

```bash
# Navigate to project directory
cd /path/to/japm

# Deploy migration to production
npx prisma migrate deploy

# Verify migration status
npx prisma migrate status
```

## Docker Environment

If running in Docker:

```bash
# Using Docker Compose
docker-compose exec japm-api npx prisma migrate deploy

# Using standalone Docker
docker exec -it <container-name> npx prisma migrate deploy
```

## Kubernetes Environment

```bash
# Execute migration in Kubernetes pod
kubectl exec -it deployment/japm-api -- npx prisma migrate deploy

# Verify migration
kubectl exec -it deployment/japm-api -- npx prisma migrate status
```

## Verification Steps

After running the migration:

1. **Check Migration Status**:
   ```bash
   npx prisma migrate status
   ```

2. **Verify Database Schema**:
   ```bash
   npx prisma db pull
   # Check that the generated schema matches the expected relations
   ```

3. **Test Cascade Delete**:
   - Create a test prompt with versions and translations
   - Delete a prompt version
   - Verify that translations are automatically removed

## Rollback (if needed)

If you need to rollback this migration:

```bash
# Reset to previous migration
npx prisma migrate reset

# Or manually revert the schema changes and create a new migration
```

## Important Notes

- ⚠️ **Backup your database** before applying this migration in production
- This migration may take some time if you have large amounts of translation data
- The cascade delete behavior will immediately take effect after migration
- Test the migration in a development environment first

## Related Changes

This migration supports the following code changes:
- Idempotent DELETE operations across all services
- Improved error handling for race conditions
- Enhanced audit logging for DELETE operations
- System-wide consistent DELETE behavior

## Support

If you encounter issues during migration:
1. Check the Prisma migration logs
2. Verify database connectivity
3. Ensure no active transactions are blocking the migration
4. Consult the error documentation in `.cursor/rules/error-documentation.mdc`

---
**Created**: 2025-05-24  
**Author**: AI Assistant  
**Status**: Pending Application 