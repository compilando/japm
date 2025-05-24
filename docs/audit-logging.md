# Audit Logging System - JAPM

## Overview

The JAPM (Just Another Prompt Manager) application includes a comprehensive audit logging system designed to provide full traceability of all business operations, enhance security, ensure compliance, and improve operational visibility.

## Architecture

### Core Components

```mermaid
graph TB
    A[HTTP Request] --> B[StructuredLoggerMiddleware]
    B --> C[Controller Method]
    C --> D[AuditInterceptor]
    D --> E[Service Method]
    E --> F[AuditLoggerService]
    F --> G[StructuredLoggerService]
    G --> H[Log Output]
    
    I[@Audit Decorator] --> D
    J[Business Logic] --> F
```

### 1. StructuredLoggerService

**Purpose**: Centralized structured logging with JSON format for all application logs.

**Features**:
- Categorized logs: HTTP, audit, business, system, security
- Rich context support (userId, tenantId, projectId, etc.)
- Environment-aware logging levels
- Automatic sanitization of sensitive data

**Usage**:
```typescript
this.structuredLogger.info(
  'User action completed',
  { userId: 'user-123', tenantId: 'tenant-456' },
  { duration: 150, statusCode: 200 },
  'business'
);
```

### 2. AuditLoggerService

**Purpose**: Specialized audit event logging with automatic risk classification.

**Features**:
- Automatic risk level classification (LOW, MEDIUM, HIGH, CRITICAL)
- Specialized methods for CRUD operations
- State tracking (previous/new states for updates)
- Comprehensive audit trail for compliance

**Risk Level Classification**:
- **CRITICAL**: Authentication events (LOGIN, LOGOUT)
- **HIGH**: DELETE operations
- **MEDIUM**: CREATE/UPDATE of critical resources, PUBLISH/APPROVE operations
- **LOW**: READ operations, CREATE/UPDATE of non-critical resources

**Usage**:
```typescript
this.auditLogger.logDeletion(
  context,
  'Prompt',
  'prompt-123',
  'My Prompt',
  deletedData,
  error // optional
);
```

### 3. Middleware and Interceptors

#### StructuredLoggerMiddleware

**Purpose**: Automatic HTTP request/response logging for all endpoints.

**Features**:
- Performance metrics (duration, status codes)
- User context extraction from JWT tokens
- Sensitive data sanitization (headers, body)
- Request/response size tracking

#### AuditInterceptor

**Purpose**: Automatic audit logging via decorators.

**Features**:
- Decorator-driven audit configuration
- Automatic resource identification
- Error handling and logging
- State capture for updates

### 4. Audit Decorators

#### Main Decorator

```typescript
@Audit({
  action: AuditAction.DELETE,
  resourceType: 'Prompt',
  resourceIdParam: 'id',
  resourceNameField: 'name',
  riskLevel: 'HIGH'
})
async remove(id: string): Promise<void> {
  // Implementation
}
```

#### Convenience Decorators

```typescript
// For CREATE operations
@AuditCreate('Prompt', { resourceNameField: 'name' })

// For UPDATE operations  
@AuditUpdate('Prompt', { resourceIdParam: 'id', resourceNameField: 'name' })

// For DELETE operations
@AuditDelete('Prompt', { resourceIdParam: 'id' })

// For READ operations
@AuditView('Prompt', { resourceIdParam: 'id' })
@AuditList('Prompt')
```

## Log Structure

### Structured Log Entry

```json
{
  "timestamp": "2024-12-19T18:58:00.000Z",
  "level": "info",
  "message": "HTTP request completed",
  "context": {
    "userId": "user-123",
    "tenantId": "tenant-456",
    "projectId": "project-789",
    "ip": "192.168.1.100",
    "userAgent": "Mozilla/5.0...",
    "operation": "HTTP_POST"
  },
  "metadata": {
    "duration": 150,
    "request": {
      "method": "POST",
      "url": "/api/prompts",
      "headers": { "authorization": "***REDACTED***" },
      "body": { "name": "New Prompt", "password": "***REDACTED***" }
    },
    "response": {
      "statusCode": 201,
      "size": 1024
    }
  },
  "category": "http",
  "environment": "production",
  "application": "japm",
  "version": "1.0.0"
}
```

### Audit Log Entry

```json
{
  "timestamp": "2024-12-19T18:58:00.000Z",
  "level": "warn",
  "message": "AUDIT: DELETE Prompt(example-prompt) SUCCESS",
  "context": {
    "userId": "user-123",
    "tenantId": "tenant-456",
    "projectId": "project-789",
    "resourceType": "Prompt",
    "resourceId": "example-prompt",
    "operation": "DELETE_PROMPT",
    "ip": "192.168.1.100",
    "userAgent": "Mozilla/5.0..."
  },
  "metadata": {
    "businessData": {
      "action": "DELETE",
      "resourceType": "Prompt",
      "resourceId": "example-prompt",
      "resourceName": "Example Prompt",
      "result": "SUCCESS",
      "riskLevel": "HIGH",
      "details": { 
        "deletedAt": "2024-12-19T18:58:00.000Z",
        "duration": 45,
        "method": "DELETE",
        "url": "/api/projects/proj-123/prompts/example-prompt"
      },
      "previousState": {
        "id": "example-prompt",
        "name": "Example Prompt",
        "description": "A sample prompt",
        "type": "SYSTEM",
        "projectId": "project-789",
        "tenantId": "tenant-456",
        "createdAt": "2024-12-18T10:00:00.000Z",
        "updatedAt": "2024-12-19T15:30:00.000Z",
        "versionsCount": 3,
        "tagsCount": 2
      }
    }
  },
  "category": "audit",
  "environment": "production",
  "application": "japm",
  "version": "1.0.0"
}
```

## Configuration

### Environment Variables

```env
# Logging Configuration
LOG_LEVEL=info                    # debug, info, warn, error
NODE_ENV=production              # development, production

# Application Info
APPLICATION_NAME=japm
APPLICATION_VERSION=1.0.0
```

### Log Levels by Environment

**Development**:
- LOG_LEVEL=debug
- Pretty-printed JSON for readability
- All audit events logged

**Production**:
- LOG_LEVEL=info
- Compact JSON for log aggregation
- High and critical risk events emphasized

## Security Features

### Data Sanitization

**Sensitive Fields Automatically Redacted**:
- `password`
- `token`
- `secret`
- `apiKey`, `api_key`
- `accessToken`, `refreshToken`
- `privateKey`
- `clientSecret`
- `authorization` header
- `cookie` header
- `x-api-key` header

**Example**:
```json
{
  "body": {
    "username": "john.doe",
    "password": "***REDACTED***",
    "apiKey": "***REDACTED***"
  }
}
```

### Access Control

- Audit logs should be stored in secure, append-only storage
- Access to audit logs should be restricted to authorized personnel
- Log integrity should be verified using checksums or digital signatures

## Performance Considerations

### Logging Overhead

- **Target**: <5% performance overhead
- **Async Logging**: Non-critical audit events can be logged asynchronously
- **Buffering**: Log entries can be buffered for batch processing
- **Sampling**: High-frequency events can be sampled in production

### Storage Optimization

- **Log Rotation**: Automatic rotation based on size/time
- **Compression**: Older logs compressed to save space
- **Archiving**: Long-term storage in cold storage
- **Retention**: Configurable retention policies

## Compliance and Governance

### Audit Trail Requirements

1. **Immutability**: Audit logs cannot be modified after creation
2. **Completeness**: All business operations must be audited
3. **Accuracy**: Audit logs must accurately reflect system state
4. **Availability**: Audit logs must be available for compliance reviews

### Retention Policies

- **High-Risk Operations**: 7 years retention
- **Medium-Risk Operations**: 3 years retention  
- **Low-Risk Operations**: 1 year retention
- **System Logs**: 90 days retention

### Compliance Standards

- **SOX**: Financial data access and modifications
- **GDPR**: Personal data processing activities
- **HIPAA**: Healthcare data access (if applicable)
- **SOC 2**: Security and availability controls

## Monitoring and Alerting

### Key Metrics

1. **Audit Event Volume**: Events per minute/hour
2. **High-Risk Operations**: Count and frequency
3. **Failed Operations**: Error rates and patterns
4. **User Activity**: Unusual access patterns
5. **System Performance**: Logging overhead impact

### Alert Conditions

- **Critical**: Multiple failed authentication attempts
- **High**: Bulk delete operations
- **Medium**: Unusual access patterns
- **Low**: System performance degradation

### Dashboard Components

1. **Real-time Event Stream**: Live audit events
2. **Risk Level Distribution**: Pie chart of risk levels
3. **User Activity**: Top active users and operations
4. **Error Trends**: Failed operations over time
5. **Performance Impact**: Logging overhead metrics

## Integration

### Log Aggregation

**Supported Systems**:
- **ELK Stack**: Elasticsearch, Logstash, Kibana
- **Fluentd**: Log collection and forwarding
- **Splunk**: Enterprise log analysis
- **CloudWatch**: AWS native logging
- **Stackdriver**: Google Cloud logging

**Configuration Example (Fluentd)**:
```xml
<source>
  @type tail
  path /var/log/japm/*.log
  pos_file /var/log/fluentd/japm.log.pos
  tag japm.audit
  format json
</source>

<match japm.audit>
  @type elasticsearch
  host elasticsearch.example.com
  port 9200
  index_name japm-audit
  type_name audit_log
</match>
```

### SIEM Integration

**Common SIEM Platforms**:
- **Splunk Enterprise Security**
- **IBM QRadar**
- **ArcSight**
- **LogRhythm**

**Integration Methods**:
- **Syslog**: RFC 5424 compliant syslog messages
- **REST API**: Direct API integration
- **File Export**: Batch file exports
- **Message Queue**: Real-time streaming via Kafka/RabbitMQ

## Troubleshooting

### Common Issues

1. **High Logging Overhead**
   - **Symptoms**: Increased response times, high CPU usage
   - **Solutions**: Enable async logging, reduce log level, implement sampling

2. **Missing Audit Events**
   - **Symptoms**: Gaps in audit trail
   - **Solutions**: Check decorator configuration, verify interceptor registration

3. **Log Storage Issues**
   - **Symptoms**: Disk space warnings, log rotation failures
   - **Solutions**: Configure retention policies, enable compression

4. **Performance Degradation**
   - **Symptoms**: Slow API responses
   - **Solutions**: Optimize log serialization, use log buffering

### Debug Commands

```bash
# Check log configuration
kubectl exec -it deployment/japm-api -- env | grep LOG

# View recent audit logs
kubectl logs deployment/japm-api | grep '"category":"audit"' | tail -20

# Monitor log volume
kubectl logs deployment/japm-api | grep '"category":"audit"' | wc -l

# Check performance impact
kubectl top pods -l app=japm-api
```

## Best Practices

### Development

1. **Use Appropriate Log Levels**: Debug for development, info for production
2. **Test Audit Coverage**: Ensure all business operations are audited
3. **Validate Sanitization**: Verify sensitive data is properly redacted
4. **Performance Testing**: Measure logging overhead regularly

### Production

1. **Monitor Log Volume**: Set up alerts for unusual log volume
2. **Regular Audits**: Periodic review of audit log completeness
3. **Backup Strategy**: Ensure audit logs are included in backups
4. **Access Control**: Restrict access to audit logs

### Security

1. **Log Integrity**: Implement log signing or checksums
2. **Secure Transport**: Use TLS for log transmission
3. **Access Logging**: Log access to audit logs themselves
4. **Incident Response**: Include audit logs in incident investigation

## Future Enhancements

### Planned Features

1. **Audit Log Search API**: RESTful API for querying audit logs
2. **Real-time Notifications**: Webhook notifications for high-risk events
3. **Analytics Dashboard**: Web UI for audit log analysis
4. **Automated Reporting**: Scheduled compliance reports
5. **Machine Learning**: Anomaly detection in audit patterns

### Integration Roadmap

1. **Q1 2025**: SIEM integration and advanced alerting
2. **Q2 2025**: Audit log search API and dashboard
3. **Q3 2025**: Machine learning-based anomaly detection
4. **Q4 2025**: Automated compliance reporting

This audit logging system provides a solid foundation for security, compliance, and operational visibility in the JAPM application, with room for future enhancements and integrations. 