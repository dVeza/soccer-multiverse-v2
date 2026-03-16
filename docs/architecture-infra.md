# Infrastructure Architecture

## AWS Production Architecture

Single CloudFront distribution serves both the React SPA (from S3) and the FastAPI backend (via ALB), eliminating CORS and providing a unified HTTPS endpoint.

```mermaid
graph TB
    subgraph Internet
        User[User Browser]
    end

    subgraph AWS Cloud
        CF[CloudFront Distribution<br/>HTTPS termination]

        subgraph VPC
            subgraph Public Subnets
                ALB[Application Load Balancer<br/>idle timeout: 180s]
            end

            subgraph Private Subnets
                ECS[ECS Fargate Service<br/>Backend - ARM64<br/>0.5 vCPU / 1GB]
                MIG[Migration Task<br/>one-shot ECS RunTask]
                NAT[NAT Gateway]
            end

            subgraph Isolated Subnets
                RDS[(RDS PostgreSQL<br/>db.t4g.micro<br/>encrypted)]
            end
        end

        S3[(S3 Bucket<br/>Frontend Static Files)]
        ECR[(ECR Repository<br/>Backend Docker Images)]
        SM[Secrets Manager<br/>DB creds + App secrets]
    end

    User -->|HTTPS| CF
    CF -->|"/* (default)"| S3
    CF -->|"/api/*"| ALB
    ALB --> ECS
    ECS --> RDS
    MIG --> RDS
    ECS --> SM
    MIG --> SM
    ECS -.->|pull image| ECR
    NAT -.->|outbound| Internet
```

## Request Routing

```mermaid
flowchart LR
    req[Incoming Request] --> CF{CloudFront}
    CF -->|"/, /players, /teams, /matches, ..."| S3[S3: index.html + assets]
    CF -->|"/api/*"| ALB[ALB: Backend API]
    CF -->|"/docs"| ALB
    CF -->|"/openapi.json"| ALB
    ALB --> ECS[ECS Fargate: FastAPI]
```

## CI/CD Pipeline

```mermaid
flowchart TD
    push[Push to master] --> det{Determine Env}
    release[Release Published] --> det
    det -->|staging| env_s[Staging]
    det -->|production| env_p[Production]

    env_s --> be[Deploy Backend]
    env_s --> fe[Deploy Frontend]
    env_p --> be
    env_p --> fe

    subgraph "Deploy Backend"
        be --> build[Build ARM64 Image]
        build --> ecr[Push to ECR]
        ecr --> migrate[Run Migration Task]
        migrate --> update[Update ECS Service]
    end

    subgraph "Deploy Frontend"
        fe --> bun[Bun Build]
        bun --> s3sync[Sync to S3]
        s3sync --> invalidate[Invalidate CloudFront]
    end
```

## CDK Stack Organization

```mermaid
graph LR
    subgraph "infra/"
        app[bin/app.ts] --> NS[NetworkStack<br/>VPC, Subnets, NAT]
        app --> DS[DatabaseStack<br/>RDS, Secrets Manager]
        app --> BS[BackendStack<br/>ECR, ECS, ALB]
        app --> FS[FrontendStack<br/>S3, CloudFront]
    end

    NS -->|vpc| DS
    NS -->|vpc| BS
    DS -->|dbInstance, secrets| BS
    BS -->|albDnsName| FS
```

## Cost Breakdown (~$78/mo)

| Resource | Monthly Cost |
|----------|-------------|
| NAT Gateway | ~$32 |
| ALB | ~$17 |
| RDS (db.t4g.micro) | ~$12 |
| ECS Fargate (ARM64) | ~$12 |
| S3 + CloudFront | ~$2 |
| ECR + Secrets + Logs | ~$3 |
