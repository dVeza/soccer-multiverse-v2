#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { type Environment, getConfig } from "../lib/config";
import { NetworkStack } from "../lib/network-stack";
import { DatabaseStack } from "../lib/database-stack";
import { BackendStack } from "../lib/backend-stack";
import { FrontendStack } from "../lib/frontend-stack";

const app = new cdk.App();

// Read environment from CDK context: cdk deploy -c env=staging
const envName = (app.node.tryGetContext("env") || "staging") as Environment;
const config = getConfig(envName);

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: config.region,
};

const network = new NetworkStack(app, `${config.prefix}-Network`, {
  env,
  config,
});

const database = new DatabaseStack(app, `${config.prefix}-Database`, {
  env,
  config,
  vpc: network.vpc,
});

const backend = new BackendStack(app, `${config.prefix}-Backend`, {
  env,
  config,
  vpc: network.vpc,
  dbInstance: database.dbInstance,
  dbSecret: database.dbSecret,
  appSecret: database.appSecret,
});

new FrontendStack(app, `${config.prefix}-Frontend`, {
  env,
  config,
  albDnsName: backend.albDnsName,
});
