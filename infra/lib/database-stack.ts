import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";
import { AppConfig } from "./config";

interface DatabaseStackProps extends cdk.StackProps {
  config: AppConfig;
  vpc: ec2.IVpc;
}

export class DatabaseStack extends cdk.Stack {
  public readonly dbInstance: rds.DatabaseInstance;
  public readonly dbSecret: secretsmanager.ISecret;
  public readonly appSecret: secretsmanager.ISecret;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    // Security group for RDS
    const dbSg = new ec2.SecurityGroup(this, "DbSecurityGroup", {
      vpc: props.vpc,
      description: "Security group for RDS PostgreSQL",
      allowAllOutbound: false,
    });
    dbSg.addIngressRule(
      ec2.Peer.ipv4(props.vpc.vpcCidrBlock),
      ec2.Port.tcp(5432),
      "Allow PostgreSQL from VPC"
    );

    // RDS-managed credentials stored in Secrets Manager
    const dbCredentials = rds.Credentials.fromGeneratedSecret("postgres", {
      secretName: `${props.config.prefix}/db-credentials`,
    });

    this.dbInstance = new rds.DatabaseInstance(this, "Database", {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16_4,
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T4G,
        ec2.InstanceSize.MICRO
      ),
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [dbSg],
      credentials: dbCredentials,
      databaseName: props.config.dbName,
      allocatedStorage: props.config.dbAllocatedStorage,
      maxAllocatedStorage: 50,
      storageEncrypted: true,
      multiAz: false,
      deletionProtection: props.config.environment === "production",
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      backupRetention: cdk.Duration.days(7),
    });

    this.dbSecret = this.dbInstance.secret!;

    // Application secrets (JWT key, superuser credentials)
    this.appSecret = new secretsmanager.Secret(this, "AppSecret", {
      secretName: `${props.config.prefix}/app-secrets`,
      description: "Application secrets (SECRET_KEY, superuser creds)",
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          FIRST_SUPERUSER: "admin@example.com",
          FIRST_SUPERUSER_PASSWORD: "changeme12345678",
        }),
        generateStringKey: "SECRET_KEY",
        excludePunctuation: true,
        passwordLength: 64,
      },
    });
  }
}
