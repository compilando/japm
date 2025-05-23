# Deployment Manual - JAPM API

## Introduction

This manual is directed to the DevOps team for deploying the JAPM (Just Another Prompt Manager) application in production environments with Kubernetes and external MySQL.

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     KUBERNETES CLUSTER                      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   Ingress       │  │  Service        │  │  ConfigMap   │ │
│  │   Controller    │  │  (LoadBalancer) │  │  & Secrets   │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
│                               │                             │
│  ┌─────────────────────────────▼─────────────────────────┐   │
│  │                JAPM API Pods                        │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │   │
│  │  │   Pod 1     │  │   Pod 2     │  │   Pod N     │  │   │
│  │  │ japm-api    │  │ japm-api    │  │ japm-api    │  │   │
│  │  │ container   │  │ container   │  │ container   │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 EXTERNAL MYSQL DATABASE                     │
│                    (Cloud Provider)                        │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

### Required Infrastructure

1. **Kubernetes Cluster** (version 1.20+)
   - Minimum 2 nodes
   - 4 CPU and 8GB RAM per node
   - Configured Storage Class

2. **External MySQL Database**
   - MySQL 8.0+
   - At least 2GB of storage
   - Access from Kubernetes cluster
   - User credentials with full permissions

3. **Container Registry**
   - Docker Hub, AWS ECR, Google GCR, or similar
   - Read access from cluster

### Required Tools

- `kubectl` (configured for the cluster)
- `docker` (for image building)
- `git` (for repository access)

## Docker Image Build Process

### 1. Clone Repository

```bash
git clone <repository-url>
cd japm
```

### 2. Environment Configuration

Create `.env` file for building (based on `env.example`):

```bash
cp env.example .env
```

**Critical variables for production:**

```env
# External MySQL database
DATABASE_URL="mysql://japm_user:SECURE_PASSWORD@mysql-host:3306/japm"

# Application configuration
NODE_ENV=production
PORT=3001

# JWT Secret (generate a secure one)
JWT_SECRET=your_super_secure_jwt_secret_here

# Regional configuration
DEFAULT_LANGUAGE_CODE=es-ES
DEFAULT_TIMEZONE=America/Mexico_City

# Logging configuration
LOG_LEVEL=info

# Disable automatic seed in production
AUTO_SEED=false
SKIP_SEED=true
```

### 3. Image Building

Use the optimized build script:

```bash
# Basic production build
./build-docker.sh --production --tag 1.0.0

# With automatic push to registry
./build-docker.sh --production --tag 1.0.0 --registry your-registry.com --push

# Multi-architecture (for ARM64 and AMD64)
./build-docker.sh --production --tag 1.0.0 --multi-arch --push
```

**Build script options:**

- `--production`: Uses optimized `Dockerfile.production`
- `--tag`: Specifies version
- `--registry`: Target registry
- `--push`: Automatic push after build
- `--multi-arch`: Multi-architecture support
- `--no-cache`: Build without cache

### 4. Image Verification

```bash
# List built images
docker images japm-api

# Run test container
docker run -p 3001:3001 --env-file .env japm-api:1.0.0

# Verify health check
curl http://localhost:3001/health
```

## Kubernetes Configuration

### 1. Namespace

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: japm
```

### 2. ConfigMap for Configuration

```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: japm-config
  namespace: japm
data:
  NODE_ENV: "production"
  PORT: "3001"
  DEFAULT_LANGUAGE_CODE: "es-ES"
  DEFAULT_TIMEZONE: "America/Mexico_City"
  LOG_LEVEL: "info"
  AUTO_SEED: "false"
  SKIP_SEED: "true"
  HEALTH_CHECK_ENABLED: "true"
  HEALTH_CHECK_PATH: "/health"
```

### 3. Secret for Sensitive Credentials

```yaml
# secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: japm-secrets
  namespace: japm
type: Opaque
data:
  DATABASE_URL: <base64-encoded-mysql-connection-string>
  JWT_SECRET: <base64-encoded-jwt-secret>
  # If using AI APIs
  OPENAI_API_KEY: <base64-encoded-openai-key>
  ANTHROPIC_API_KEY: <base64-encoded-anthropic-key>
```

**To generate base64 secrets:**

```bash
echo -n "mysql://user:password@host:3306/japm" | base64
echo -n "your-super-secure-jwt-secret" | base64
```

### 4. Deployment

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: japm-api
  namespace: japm
  labels:
    app: japm-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: japm-api
  template:
    metadata:
      labels:
        app: japm-api
    spec:
      containers:
      - name: japm-api
        image: your-registry.com/japm-api:1.0.0
        ports:
        - containerPort: 3001
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: japm-secrets
              key: DATABASE_URL
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: japm-secrets
              key: JWT_SECRET
        envFrom:
        - configMapRef:
            name: japm-config
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        volumeMounts:
        - name: upload-storage
          mountPath: /app/uploads
      volumes:
      - name: upload-storage
        persistentVolumeClaim:
          claimName: japm-uploads-pvc
      restartPolicy: Always
```

### 5. Persistent Volume Claim

```yaml
# pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: japm-uploads-pvc
  namespace: japm
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 10Gi
  storageClassName: your-storage-class
```

### 6. Service

```yaml
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: japm-api-service
  namespace: japm
spec:
  selector:
    app: japm-api
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3001
  type: ClusterIP
```

### 7. Ingress

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: japm-api-ingress
  namespace: japm
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - api.your-domain.com
    secretName: japm-tls
  rules:
  - host: api.your-domain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: japm-api-service
            port:
              number: 80
```

## MySQL Database Configuration

### 1. Database Preparation

```sql
-- Create database
CREATE DATABASE japm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create specific user
CREATE USER 'japm_user'@'%' IDENTIFIED BY 'SECURE_PASSWORD';

-- Grant permissions
GRANT ALL PRIVILEGES ON japm.* TO 'japm_user'@'%';
FLUSH PRIVILEGES;
```

### 2. Connection Variables

The application uses Prisma ORM which automatically handles:
- Connection pooling
- Schema migrations
- Transaction management

**MySQL connection string:**

```
mysql://japm_user:PASSWORD@mysql-host:3306/japm?ssl=true&connection_limit=20
```

### 3. Recommended MySQL Server Configurations

```sql
-- MySQL server configurations
SET GLOBAL max_connections = 200;
SET GLOBAL innodb_buffer_pool_size = 1073741824; -- 1GB
SET GLOBAL query_cache_size = 67108864; -- 64MB
```

## Initialization and Migration Process

### Automatic Migrations

The application includes an entry script (`docker-entrypoint.sh`) that:

1. **Waits** for database availability
2. **Executes** Prisma migrations automatically
3. **Optionally** runs initial seed (controlled by environment variables)
4. **Starts** the application

### Control Variables

```env
# Control initialization behavior
SKIP_SEED=true          # Skip seed in production
AUTO_SEED=false         # Don't run seed automatically
```

### Manual Migration Execution

If you need to run migrations manually:

```bash
# Connect to a pod
kubectl exec -it deployment/japm-api -n japm -- sh

# Run migrations
npx prisma migrate deploy

# View migration status
npx prisma migrate status
```

## Initialization Jobs (Optional)

For greater control, you can use a Kubernetes Job for initialization:

```yaml
# init-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: japm-init
  namespace: japm
spec:
  template:
    spec:
      containers:
      - name: japm-init
        image: your-registry.com/japm-api:1.0.0
        command: ["/app/docker-entrypoint.sh"]
        args: ["npx", "prisma", "migrate", "deploy"]
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: japm-secrets
              key: DATABASE_URL
        envFrom:
        - configMapRef:
            name: japm-config
      restartPolicy: Never
  backoffLimit: 4
```

## Step-by-Step Deployment

### 1. Prepare Infrastructure

```bash
# Apply namespace
kubectl apply -f namespace.yaml

# Apply configurations
kubectl apply -f configmap.yaml
kubectl apply -f secret.yaml
kubectl apply -f pvc.yaml
```

### 2. Build and Push Image

```bash
# Configure registry
export DOCKER_REGISTRY=your-registry.com

# Build image
./build-docker.sh --production --tag 1.0.0 --push
```

### 3. Deploy Application

```bash
# Apply deployment and service
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml

# Verify deployment
kubectl get pods -n japm
kubectl logs -f deployment/japm-api -n japm
```

### 4. Configure External Access

```bash
# Apply ingress
kubectl apply -f ingress.yaml

# Verify ingress
kubectl get ingress -n japm
```

### 5. Verification

```bash
# Verify application health
kubectl exec -it deployment/japm-api -n japm -- curl http://localhost:3001/health

# Verify from outside (once ingress is configured)
curl https://api.your-domain.com/health
```

## Monitoring and Logging

### Health Checks

The application exposes the `/health` endpoint which:
- Verifies database connectivity
- Reports application status
- Compatible with Kubernetes probes

### Logs

```bash
# View real-time logs
kubectl logs -f deployment/japm-api -n japm

# View logs from specific pod
kubectl logs -f pod/japm-api-xxx -n japm

# View previous logs
kubectl logs --previous deployment/japm-api -n japm
```

### Metrics

Consider integrating:
- Prometheus for metrics
- Grafana for dashboards
- ELK stack for centralized logs

## Application Updates

### Rolling Update

```bash
# Build new version
./build-docker.sh --production --tag v1.1.0 --push

# Update deployment
kubectl set image deployment/japm-api japm-api=your-registry.com/japm-api:v1.1.0 -n japm

# Verify rollout
kubectl rollout status deployment/japm-api -n japm

# Rollback if necessary
kubectl rollout undo deployment/japm-api -n japm
```

## Backup and Restoration

### Database Backup

```bash
# MySQL backup
mysqldump -h mysql-host -u japm_user -p japm > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
mysql -h mysql-host -u japm_user -p japm < backup_file.sql
```

### Upload Backup

```bash
# Persistent volume backup
kubectl exec deployment/japm-api -n japm -- tar czf - /app/uploads | gzip > uploads_backup.tar.gz
```

## Troubleshooting

### Common Issues

1. **Pod won't start**
   ```bash
   kubectl describe pod <pod-name> -n japm
   kubectl logs <pod-name> -n japm
   ```

2. **Database connection error**
   - Verify credentials in secret
   - Verify network connectivity
   - Verify MySQL user permissions

3. **Migrations fail**
   ```bash
   kubectl exec -it deployment/japm-api -n japm -- npx prisma migrate status
   ```

4. **Health check fails**
   ```bash
   kubectl exec -it deployment/japm-api -n japm -- curl -v http://localhost:3001/health
   ```

### Diagnostic Commands

```bash
# General status
kubectl get all -n japm

# Namespace events
kubectl get events -n japm --sort-by=.metadata.creationTimestamp

# Describe deployment
kubectl describe deployment japm-api -n japm

# Verify configuration
kubectl get configmap japm-config -n japm -o yaml
kubectl get secret japm-secrets -n japm -o yaml
```

## Security Considerations

1. **Secrets Management**
   - Use external secrets operator for cloud provider integration
   - Rotate credentials regularly

2. **Network Policies**
   - Configure network policies to limit traffic
   - Allow only necessary traffic

3. **RBAC**
   - Configure service accounts with minimal permissions
   - Use Pod Security Standards

4. **Image Security**
   - Scan images for vulnerabilities
   - Use updated base images
   - Implement admission controller policies

## Scalability

### Horizontal Pod Autoscaler

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: japm-api-hpa
  namespace: japm
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: japm-api
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### Connection Pool Configuration

```env
# Variables to optimize MySQL connections
DATABASE_URL="mysql://user:pass@host:3306/japm?connection_limit=20&pool_timeout=20"
```

## Complete Environment Variables

```env
# === CRITICAL CONFIGURATION ===
DATABASE_URL=mysql://japm_user:PASSWORD@mysql-host:3306/japm
NODE_ENV=production
PORT=3001
JWT_SECRET=your_super_secure_jwt_secret

# === APPLICATION CONFIGURATION ===
DEFAULT_LANGUAGE_CODE=es-ES
DEFAULT_TIMEZONE=America/Mexico_City
LOG_LEVEL=info

# === INITIALIZATION CONTROL ===
AUTO_SEED=false
SKIP_SEED=true

# === SECURITY CONFIGURATION ===
CORS_ORIGINS=https://your-frontend-domain.com
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=1

# === FILE CONFIGURATION ===
MAX_FILE_SIZE=10485760
UPLOAD_DIR=/app/uploads

# === HEALTH CHECKS ===
HEALTH_CHECK_ENABLED=true
HEALTH_CHECK_PATH=/health

# === EXTERNAL APIS (OPTIONAL) ===
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
```

This manual provides everything necessary for the DevOps team to deploy and maintain the JAPM application in a production environment with Kubernetes and external MySQL. 