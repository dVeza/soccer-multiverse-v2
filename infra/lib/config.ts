export type Environment = "staging" | "production";

export interface AppConfig {
  prefix: string;
  environment: Environment;
  region: string;
  projectName: string;
  // Backend
  backendCpu: number;
  backendMemory: number;
  backendDesiredCount: number;
  // Database
  dbInstanceClass: string;
  dbAllocatedStorage: number;
  dbName: string;
  // Optional custom domain (for future use)
  domainName?: string;
  hostedZoneId?: string;
}

export function getConfig(env: Environment): AppConfig {
  const common = {
    region: "eu-west-1",
    projectName: "Soccer Multiverse 2",
    dbName: "app",
    dbAllocatedStorage: 20,
  };

  switch (env) {
    case "staging":
      return {
        ...common,
        prefix: "SoccerMV-Staging",
        environment: "staging",
        backendCpu: 256,
        backendMemory: 512,
        backendDesiredCount: 1,
        dbInstanceClass: "db.t4g.micro",
      };
    case "production":
      return {
        ...common,
        prefix: "SoccerMV-Prod",
        environment: "production",
        backendCpu: 512,
        backendMemory: 1024,
        backendDesiredCount: 1,
        dbInstanceClass: "db.t4g.micro",
      };
  }
}
