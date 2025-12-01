# Kubernetes Deployment Guide

This directory contains the Kubernetes manifests for deploying the NDR platform.

## Directory Structure

- `base/`: Common configuration (ConfigMaps, Secrets).
- `infra/`: Infrastructure services (Postgres, Redis, Kafka, OpenSearch).
- `services/`: Rust microservices and UI.

## Prerequisites

- A running Kubernetes cluster (Minikube, Kind, GKE, EKS, etc.).
- `kubectl` installed and configured.

## Deployment Steps

### 1. Apply Base Configuration

```bash
kubectl apply -f k8s/base/
```

### 2. Deploy Infrastructure

```bash
kubectl apply -f k8s/infra/
```

Wait for the infrastructure pods to be ready:

```bash
kubectl get pods -w
```

### 3. Deploy Services

```bash
kubectl apply -f k8s/services/
```

### 4. Access the Application

- **UI**: Exposed on port 80 (ClusterIP). You may need to use `kubectl port-forward` or configure an Ingress/LoadBalancer depending on your cluster.

```bash
kubectl port-forward svc/ui 8080:80
```

Then access http://localhost:8080.

## Notes

- **Secrets**: The `k8s/base/config.yaml` contains default secrets. **DO NOT USE THESE IN PRODUCTION.** Update the Secret manifest with secure values.
- **Storage**: The infrastructure manifests use `volumeClaimTemplates` with default storage classes. Ensure your cluster supports dynamic provisioning or update the manifests to use specific PersistentVolumes.
