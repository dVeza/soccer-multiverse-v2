import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as logs from "aws-cdk-lib/aws-logs";
import * as rds from "aws-cdk-lib/aws-rds";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";
import { AppConfig } from "./config";

interface BackendStackProps extends cdk.StackProps {
  config: AppConfig;
  vpc: ec2.IVpc;
  dbInstance: rds.DatabaseInstance;
  dbSecret: secretsmanager.ISecret;
  appSecret: secretsmanager.ISecret;
}

export class BackendStack extends cdk.Stack {
  public readonly albDnsName: string;

  constructor(scope: Construct, id: string, props: BackendStackProps) {
    super(scope, id, props);

    // --- ECR Repository ---
    const repo = new ecr.Repository(this, "BackendRepo", {
      repositoryName: `${props.config.prefix.toLowerCase()}-backend`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules: [
        { maxImageCount: 10, description: "Keep last 10 images" },
      ],
    });

    // --- ECS Cluster ---
    const cluster = new ecs.Cluster(this, "Cluster", {
      vpc: props.vpc,
      clusterName: `${props.config.prefix}-Cluster`,
      containerInsights: false,
    });

    // --- Shared env vars and secrets for backend containers ---
    const sharedEnvironment: Record<string, string> = {
      ENVIRONMENT: props.config.environment,
      PROJECT_NAME: props.config.projectName,
      POSTGRES_DB: props.config.dbName,
      POSTGRES_PORT: "5432",
      // FRONTEND_HOST and BACKEND_CORS_ORIGINS should be set to the
      // CloudFront distribution URL after first deploy. For now, allow
      // all origins in staging. Update config.ts with the actual URL.
      FRONTEND_HOST: props.config.domainName
        ? `https://${props.config.domainName}`
        : "",
      BACKEND_CORS_ORIGINS: props.config.domainName
        ? `https://${props.config.domainName}`
        : "*",
    };

    const sharedSecrets: Record<string, ecs.Secret> = {
      POSTGRES_SERVER: ecs.Secret.fromSecretsManager(props.dbSecret, "host"),
      POSTGRES_USER: ecs.Secret.fromSecretsManager(
        props.dbSecret,
        "username"
      ),
      POSTGRES_PASSWORD: ecs.Secret.fromSecretsManager(
        props.dbSecret,
        "password"
      ),
      SECRET_KEY: ecs.Secret.fromSecretsManager(props.appSecret, "SECRET_KEY"),
      FIRST_SUPERUSER: ecs.Secret.fromSecretsManager(
        props.appSecret,
        "FIRST_SUPERUSER"
      ),
      FIRST_SUPERUSER_PASSWORD: ecs.Secret.fromSecretsManager(
        props.appSecret,
        "FIRST_SUPERUSER_PASSWORD"
      ),
    };

    // --- Backend Service Task Definition ---
    const backendTaskDef = new ecs.FargateTaskDefinition(
      this,
      "BackendTaskDef",
      {
        cpu: props.config.backendCpu,
        memoryLimitMiB: props.config.backendMemory,
        runtimePlatform: {
          cpuArchitecture: ecs.CpuArchitecture.ARM64,
          operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
        },
      }
    );

    const backendContainer = backendTaskDef.addContainer("backend", {
      image: ecs.ContainerImage.fromEcrRepository(repo, "latest"),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: "backend",
        logRetention: logs.RetentionDays.TWO_WEEKS,
      }),
      environment: sharedEnvironment,
      secrets: sharedSecrets,
      healthCheck: {
        command: [
          "CMD-SHELL",
          "curl -f http://localhost:8000/api/v1/utils/health-check/ || exit 1",
        ],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        retries: 3,
        startPeriod: cdk.Duration.seconds(60),
      },
    });

    backendContainer.addPortMappings({
      containerPort: 8000,
      protocol: ecs.Protocol.TCP,
    });

    // --- Migration Task Definition (one-shot) ---
    const migrationTaskDef = new ecs.FargateTaskDefinition(
      this,
      "MigrationTaskDef",
      {
        cpu: 256,
        memoryLimitMiB: 512,
        runtimePlatform: {
          cpuArchitecture: ecs.CpuArchitecture.ARM64,
          operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
        },
      }
    );

    migrationTaskDef.addContainer("migration", {
      image: ecs.ContainerImage.fromEcrRepository(repo, "latest"),
      command: ["bash", "scripts/prestart.sh"],
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: "migration",
        logRetention: logs.RetentionDays.TWO_WEEKS,
      }),
      environment: sharedEnvironment,
      secrets: sharedSecrets,
      essential: true,
    });

    // Security group for migration task (needs RDS access)
    const migrationSg = new ec2.SecurityGroup(this, "MigrationSg", {
      vpc: props.vpc,
      description: "Security group for migration task",
    });
    props.dbInstance.connections.allowFrom(
      migrationSg,
      ec2.Port.tcp(5432),
      "Allow migration task to connect to RDS"
    );

    // --- ALB ---
    const alb = new elbv2.ApplicationLoadBalancer(this, "Alb", {
      vpc: props.vpc,
      internetFacing: true,
      idleTimeout: cdk.Duration.seconds(180), // SSE streaming support
    });

    const listener = alb.addListener("HttpListener", {
      port: 80,
      // TLS terminates at CloudFront, not ALB
    });

    // --- ECS Backend Service ---
    const backendService = new ecs.FargateService(this, "BackendService", {
      cluster,
      taskDefinition: backendTaskDef,
      desiredCount: props.config.backendDesiredCount,
      serviceName: `${props.config.prefix}-Backend`,
      assignPublicIp: false,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      healthCheckGracePeriod: cdk.Duration.seconds(120),
    });

    listener.addTargets("BackendTarget", {
      port: 8000,
      targets: [backendService],
      healthCheck: {
        path: "/api/v1/utils/health-check/",
        interval: cdk.Duration.seconds(30),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
        timeout: cdk.Duration.seconds(10),
      },
      deregistrationDelay: cdk.Duration.seconds(30),
    });

    // Allow ECS service to reach RDS
    props.dbInstance.connections.allowFrom(
      backendService,
      ec2.Port.tcp(5432),
      "Allow backend service to connect to RDS"
    );

    this.albDnsName = alb.loadBalancerDnsName;

    // --- Outputs ---
    new cdk.CfnOutput(this, "AlbDnsName", {
      value: alb.loadBalancerDnsName,
    });
    new cdk.CfnOutput(this, "EcrRepoUri", { value: repo.repositoryUri });
    new cdk.CfnOutput(this, "ClusterArn", { value: cluster.clusterArn });
    new cdk.CfnOutput(this, "ServiceName", {
      value: backendService.serviceName,
    });
    new cdk.CfnOutput(this, "MigrationTaskDefArn", {
      value: migrationTaskDef.taskDefinitionArn,
    });
    new cdk.CfnOutput(this, "MigrationSecurityGroupId", {
      value: migrationSg.securityGroupId,
    });
  }
}
