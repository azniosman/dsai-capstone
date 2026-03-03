import { AWSIconType } from "./aws-icon";

export interface ArchitectureNode {
  id: string;
  name: string;
  type: AWSIconType;
  layer: "Frontend" | "API" | "Data" | "Automation";
  metadata: {
    specs?: string;
    runtime?: string;
    description: string;
  };
  position: { x: number; y: number; z: number };
}

export interface ArchitectureEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
}

export const ARCHITECTURE_DATA: { nodes: ArchitectureNode[]; edges: ArchitectureEdge[] } = {
  nodes: [
    {
      id: "cdn",
      name: "CloudFront",
      type: "CloudFront",
      layer: "Frontend",
      position: { x: 50, y: 150, z: 0 },
      metadata: { description: "Global edge delivery for static assets (React/Next.js). HTTPS enforced." }
    },
    {
      id: "s3_web",
      name: "S3 Website",
      type: "S3",
      layer: "Frontend",
      position: { x: 50, y: 300, z: 0 },
      metadata: { description: "Static host for SkillBridge portal (Next.js 15 export)." }
    },
    {
      id: "api_gw",
      name: "API Gateway",
      type: "APIGateway",
      layer: "API",
      position: { x: 300, y: 150, z: -3 },
      metadata: { specs: "HTTP API & WebSockets", description: "Aggregates all backend traffic and voice streaming. Handles proxy and stateful connections." }
    },
    {
      id: "lambda_nest",
      name: "NestJS API",
      type: "Lambda",
      layer: "API",
      position: { x: 300, y: 300, z: -3 },
      metadata: { specs: "3008 MB | 120s Timeout", runtime: "Node.js 20.x", description: "Core business logic with MikroORM integration. Serves /{proxy+} endpoints." }
    },
    {
      id: "lambda_voice",
      name: "Voice Engine",
      type: "Lambda",
      layer: "API",
      position: { x: 550, y: 50, z: -3 },
      metadata: { description: "Real-time audio processing via AWS Polly and Transcribe. WebSocket push delivery." }
    },
    {
      id: "lambda_ai",
      name: "AI Core",
      type: "Lambda",
      layer: "API",
      position: { x: 550, y: 300, z: -3 },
      metadata: { specs: "Shared ECR Image", description: "Dedicated instances for RAG query, Gap Analysis, and Resume Parsing." }
    },
    {
      id: "rds",
      name: "PostgreSQL",
      type: "RDS",
      layer: "Data",
      position: { x: 800, y: 250, z: -6 },
      metadata: { specs: "Multi-AZ | pgvector", description: "Relational data store with vector similarity search capabilities." }
    },
    {
      id: "bedrock",
      name: "AWS Bedrock",
      type: "Bedrock",
      layer: "Data",
      position: { x: 1050, y: 150, z: -6 },
      metadata: { description: "Serverless LLM access (Claude 3.5 / Gemini) for intelligent analysis." }
    },
    {
      id: "secrets",
      name: "Secrets Mgr",
      type: "SecretsManager",
      layer: "Data",
      position: { x: 800, y: 450, z: -6 },
      metadata: { description: "Encrypted storage for API keys, DB credentials, and environment overrides." }
    },
    {
      id: "scheduler",
      name: "EventBridge",
      type: "EventBridge",
      layer: "Automation",
      position: { x: 425, y: 500, z: -9 },
      metadata: { description: "Triggers daily syncs, cache cleanup, and precompute tasks at /internal/*." }
    }
  ],
  edges: [
    // Frontend -> API Gateway
    { id: "e1", source: "cdn", target: "s3_web", animated: true },
    { id: "e2", source: "cdn", target: "api_gw", label: "HTTPS / WSS", animated: true },

    // API Gateway -> Lambdas
    { id: "e3", source: "api_gw", target: "lambda_nest", label: "REST /{proxy+}" },
    { id: "e4", source: "api_gw", target: "lambda_voice", label: "$connect / $default / $disconnect", animated: true },

    // NestJS -> RDS, AI Lambdas, Secrets
    { id: "e5", source: "lambda_nest", target: "rds", label: "MikroORM" },
    { id: "e6", source: "lambda_nest", target: "lambda_ai", label: "Lambda Invoke" },
    { id: "e7", source: "lambda_nest", target: "secrets" },

    // AI Core -> Bedrock & RDS
    { id: "e8", source: "lambda_ai", target: "bedrock", animated: true },
    { id: "e9", source: "lambda_ai", target: "rds", label: "pgvector" },

    // Voice Engine -> S3 (Temp Audio) could be added theoretically but omitted to keep graph clean
    // EventBridge Scheduler -> NestJS & Other Lambdas
    { id: "e10", source: "scheduler", target: "lambda_nest", label: "Lambda Invoke /internal/*", animated: true },
    { id: "e11", source: "scheduler", target: "lambda_ai", label: "Lambda Invoke", animated: true },
    
    // Voice Engine -> AWS Bedrock / LLMs
    { id: "e12", source: "lambda_voice", target: "bedrock", animated: true }
  ]
};
