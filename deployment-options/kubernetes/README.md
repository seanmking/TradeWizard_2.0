# TradeWizard 2.0 - Kubernetes Deployment Architecture

This document outlines the Kubernetes architecture for deploying TradeWizard 2.0 in a scalable, resilient, and maintainable way across multiple environments (development, staging, and production).

## Architecture Overview

![Architecture Diagram](./architecture-diagram.png)

TradeWizard 2.0 is deployed using a Kubernetes architecture with the following key components:

1. **Frontend Pods**: Next.js application serving the UI
2. **Backend Pods**: Express.js application for business logic
3. **Web Scraper Pods**: Dedicated service for web scraping
4. **Redis Cluster**: Distributed caching layer
5. **Database**: Supabase/PostgreSQL database
6. **Monitoring Stack**: Prometheus, Grafana, and ELK for logging

## Directory Structure

```
kubernetes/
├── base/                    # Base Kubernetes manifests (used by all environments)
│   ├── frontend/            # Frontend application manifests
│   ├── backend/             # Backend application manifests
│   ├── scraper/             # Web scraper service manifests
│   ├── redis/               # Redis cluster manifests
│   └── monitoring/          # Monitoring stack manifests
│
├── overlays/                # Environment-specific configurations
│   ├── development/         # Development environment
│   ├── staging/             # Staging environment
│   └── production/          # Production environment
│
├── scripts/                 # Deployment and management scripts
│
└── README.md                # This documentation file
```

## Component Details

### 1. Frontend Deployment

The Next.js application is deployed as a scalable set of pods with the following characteristics:

- **Deployment Type**: Deployment
- **Replicas**: 2-10 (auto-scaling based on CPU/memory)
- **Image**: `tradewizard/frontend:${VERSION}`
- **Resource Requests**:
  - CPU: 0.5 cores
  - Memory: 512Mi
- **Resource Limits**:
  - CPU: 1 core
  - Memory: 1Gi
- **Liveness Probe**: HTTP check on `/api/health`
- **Readiness Probe**: HTTP check on `/api/ready`
- **Service Type**: ClusterIP with Ingress

### 2. Backend Deployment

The Express.js backend is deployed as a scalable set of pods:

- **Deployment Type**: Deployment
- **Replicas**: 2-10 (auto-scaling based on CPU/memory/request count)
- **Image**: `tradewizard/backend:${VERSION}`
- **Resource Requests**:
  - CPU: 0.5 cores
  - Memory: 512Mi
- **Resource Limits**:
  - CPU: 2 cores
  - Memory: 2Gi
- **Liveness Probe**: HTTP check on `/api/health`
- **Readiness Probe**: HTTP check on `/api/ready`
- **Service Type**: ClusterIP

### 3. Web Scraper Service

The web scraper service is deployed with special consideration for external rate limiting:

- **Deployment Type**: Deployment
- **Replicas**: 2-5 (auto-scaling based on queue size)
- **Image**: `tradewizard/scraper:${VERSION}`
- **Resource Requests**:
  - CPU: 0.5 cores
  - Memory: 1Gi
- **Resource Limits**:
  - CPU: 2 cores
  - Memory: 4Gi
- **Liveness Probe**: HTTP check on `/health`
- **Readiness Probe**: HTTP check on `/ready`
- **Service Type**: ClusterIP
- **Special Considerations**:
  - Network Policy allowing specific external traffic
  - Pod Anti-Affinity for distributed placement

### 4. Redis Cluster

The Redis cluster is deployed for high availability and scaling:

- **Deployment Type**: StatefulSet
- **Replicas**: 6 (3 masters, 3 replicas)
- **Image**: `redis:7.0-alpine`
- **Persistence**: PersistentVolumeClaim
- **Resource Requests**:
  - CPU: 0.5 cores
  - Memory: 1Gi
- **Resource Limits**:
  - CPU: 2 cores
  - Memory: 4Gi
- **Service Type**: ClusterIP + Headless Service
- **Special Considerations**:
  - Pod Anti-Affinity for distributed placement
  - Node Affinity for SSD-backed nodes

### 5. Database Integration

The Supabase/PostgreSQL database is deployed externally (not in Kubernetes), but is integrated via:

- **Connection Type**: Service with ExternalName
- **Authentication**: Secrets stored in Kubernetes

## Scaling Policies

### 1. Frontend Auto-scaling

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: frontend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: frontend
  minReplicas: 2
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

### 2. Backend Auto-scaling

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend-api
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Pods
    pods:
      metric:
        name: requests_per_second
      target:
        type: AverageValue
        averageValue: 50
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
    scaleUp:
      stabilizationWindowSeconds: 60
```

### 3. Web Scraper Auto-scaling

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: scraper-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-scraper
  minReplicas: 2
  maxReplicas: 5
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60
  - type: External
    external:
      metric:
        name: scraper_queue_size
      target:
        type: AverageValue
        averageValue: 100
```

## Environment-specific Configurations

### Development Environment

- **Namespace**: `tradewizard-dev`
- **Replicas**: Minimum for each component
- **Resources**: Reduced requests/limits
- **Ingress**: Development domain
- **Features**: Debug mode enabled

### Staging Environment

- **Namespace**: `tradewizard-staging`
- **Replicas**: Same as production but reduced maximum
- **Resources**: Same as production
- **Ingress**: Staging domain
- **Features**: Full monitoring, mock external services

### Production Environment

- **Namespace**: `tradewizard-prod`
- **Replicas**: Full auto-scaling
- **Resources**: Full requests/limits
- **Ingress**: Production domain
- **Features**: Full monitoring, alerting, and backups

## Monitoring Stack

The monitoring stack includes:

1. **Prometheus**: Metrics collection
2. **Grafana**: Visualization and dashboards
3. **ELK Stack**: Centralized logging
4. **Alert Manager**: Alerts and notifications

## Deployment Process

The deployment process uses GitOps with ArgoCD:

1. Changes are pushed to the repository
2. CI/CD pipeline builds and tests the applications
3. New container images are pushed to the registry
4. ArgoCD detects the changes and applies them to the target environment

## Cost Implications

The Kubernetes deployment has the following cost considerations:

1. **Compute Costs**:
   - Baseline (min replicas): ~$500/month
   - Peak (max replicas): ~$1,200/month

2. **Storage Costs**:
   - Redis PVs: ~$50/month
   - Backup storage: ~$30/month

3. **External Services**:
   - Supabase: $25-$500/month (depending on tier)
   - Monitoring stack (if external): ~$100/month

4. **Total Cost Range**:
   - Development: $200-300/month
   - Staging: $300-400/month
   - Production: $700-2,000/month (depending on scale)

## Getting Started

To deploy TradeWizard 2.0 to your Kubernetes cluster:

1. Ensure you have `kubectl` and `kustomize` installed
2. Set up your Kubernetes cluster
3. Configure your environment variables
4. Run the deployment script:

```bash
./scripts/deploy.sh <environment>
```

Where `<environment>` is one of: `development`, `staging`, or `production`.

## Security Considerations

The deployment includes:

1. **Network Policies**: Restricting pod-to-pod communication
2. **RBAC**: Proper role-based access control
3. **Secret Management**: Using Kubernetes Secrets for sensitive data
4. **Resource Quotas**: Limiting resource consumption per namespace
5. **Pod Security Policies**: Restricting pod privileges

## Maintenance Procedures

### Backups

The system automatically backs up:

1. Redis data: Every 6 hours
2. Application logs: Retained for 30 days
3. Monitoring data: Retained for 14 days

### Updates

Updates are applied using rolling updates to ensure zero downtime:

```bash
./scripts/update.sh <environment> <version>
```

### Rollbacks

If needed, rollbacks can be performed:

```bash
./scripts/rollback.sh <environment> <previous-version>
``` 