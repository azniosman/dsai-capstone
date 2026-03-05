import { IconType } from "./custom-node";

export interface ArchitectureNode {
  id: string;
  name: string;
  type?: IconType;
  layer: "Frontend" | "API" | "Data" | "Automation" | "Group" | "External" | "AI";
  metadata?: {
    specs?: string;
    runtime?: string;
    description: string;
  };
  position: { x: number; y: number; z: number };
  width?: number;
  height?: number;
  parentId?: string;
}

export interface ArchitectureEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
  dashed?: boolean;
}

export const ARCHITECTURE_DATA: { nodes: ArchitectureNode[]; edges: ArchitectureEdge[] } = {
  nodes: [
    // --- GROUPS ---
    {
      id: "group_frontend", name: "FRONTEND STACK", layer: "Group", type: undefined,
      position: { x: -350, y: 0, z: -5 }, width: 220, height: 450
    },
    {
      id: "group_backend", name: "BACKEND STACK", layer: "Group", type: undefined,
      position: { x: -100, y: 0, z: -5 }, width: 220, height: 500
    },
    {
      id: "group_aws", name: "AWS CLOUD", layer: "Group", type: undefined,
      position: { x: 250, y: -50, z: -6 }, width: 950, height: 850
    },
    {
      id: "group_eventbridge", name: "EVENTBRIDGE SCHEDULER", layer: "Group", type: undefined,
      position: { x: 200, y: 430, z: -4 }, width: 260, height: 380, parentId: "group_aws"
    },
    {
      id: "group_llm", name: "LLM PROVIDERS", layer: "Group", type: undefined,
      position: { x: 1250, y: 40, z: -5 }, width: 220, height: 350
    },

    // --- FRONTEND STACK ---
    {
      id: "f_react", name: "Next.js 15 + React 19", type: "Framework", layer: "Frontend",
      parentId: "group_frontend", position: { x: 50, y: 40, z: 0 },
      metadata: { description: "Modern React framework with App Router & Server Components." }
    },
    {
      id: "f_tailwind", name: "Tailwind CSS 4", type: "Library", layer: "Frontend",
      parentId: "group_frontend", position: { x: 50, y: 140, z: 0 },
      metadata: { description: "Utility-first CSS framework with Shadcn UI." }
    },
    {
      id: "f_recharts", name: "Recharts 3 + Three.js", type: "Library", layer: "Frontend",
      parentId: "group_frontend", position: { x: 50, y: 240, z: 0 },
      metadata: { description: "Data visualization and 3D rendering engine." }
    },
    {
      id: "f_zustand", name: "Zustand 5 + TanStack Query", type: "Library", layer: "Frontend",
      parentId: "group_frontend", position: { x: 50, y: 340, z: 0 },
      metadata: { description: "Global state management and asynchronous data fetching." }
    },

    // --- BACKEND STACK ---
    {
      id: "b_nest", name: "NestJS 11", type: "Framework", layer: "API",
      parentId: "group_backend", position: { x: 50, y: 40, z: 0 },
      metadata: { description: "Progressive Node.js framework (TypeScript 5.7)." }
    },
    {
      id: "b_mikroorm", name: "MikroORM 6", type: "Database", layer: "API",
      parentId: "group_backend", position: { x: 50, y: 140, z: 0 },
      metadata: { description: "TypeScript ORM for PostgreSQL." }
    },
    {
      id: "b_passport", name: "Passport.js", type: "Security", layer: "API",
      parentId: "group_backend", position: { x: 50, y: 240, z: 0 },
      metadata: { description: "Authentication middleware (JWT + Local strategy)." }
    },
    {
      id: "b_pdf", name: "pdf-parse + mammoth", type: "Document", layer: "API",
      parentId: "group_backend", position: { x: 50, y: 340, z: 0 },
      metadata: { description: "Text extraction for resumes and user documents." }
    },
    {
      id: "b_minilm", name: "MiniLM-L6-v2", type: "AI", layer: "API",
      parentId: "group_backend", position: { x: 50, y: 440, z: 0 },
      metadata: { description: "ONNX fast sentence embeddings generator (384-dim)." }
    },

    // --- EXTERNAL IDENTITIES ---
    {
      id: "users", name: "Users", type: "Users", layer: "External",
      position: { x: 150, y: 50, z: 0 },
      metadata: { description: "End users connecting to the portal globally." }
    },
    {
      id: "n8n", name: "n8n (Workflow Automation)", type: "Workflow", layer: "Automation",
      position: { x: 150, y: 200, z: 0 },
      metadata: { description: "Orchestration tool dispatching webhooks into SkillBridge." }
    },

    // --- AWS CLOUD ---
    {
      id: "cloudfront", name: "CloudFront", type: "CloudFront", layer: "Frontend",
      parentId: "group_aws", position: { x: 50, y: 130, z: 0 },
      metadata: { description: "CDN Edge proxying the website & API traffic." }
    },
    {
      id: "s3_static", name: "S3 (Next.js Static)", type: "S3", layer: "Frontend",
      parentId: "group_aws", position: { x: 300, y: 40, z: 0 },
      metadata: { description: "Bucket holding pre-built static assets (SSG)." }
    },
    {
      id: "apigw", name: "API Gateway HTTP API v2", type: "APIGateway", layer: "API",
      parentId: "group_aws", position: { x: 300, y: 230, z: 0 },
      metadata: { description: "Lightweight proxy mapping REST requests directly to Lambda." }
    },
    {
      id: "ecr", name: "ECR (Docker Images)", type: "ECR", layer: "Automation",
      parentId: "group_aws", position: { x: 300, y: 330, z: 0 },
      metadata: { description: "Registry for NextJS static exports, Lambda container formats." }
    },
    {
      id: "lambda", name: "Lambda (NestJS)", type: "Lambda", layer: "API",
      parentId: "group_aws", position: { x: 500, y: 230, z: 0 },
      metadata: { description: "Serverless container running the full NestJS 11 loop." }
    },
    {
      id: "cloudwatch", name: "CloudWatch", type: "CloudWatch", layer: "Automation",
      parentId: "group_aws", position: { x: 750, y: 130, z: 0 },
      metadata: { description: "Metrics, Log Groups, and X-Ray telemetry." }
    },
    {
      id: "secrets", name: "Secrets Manager", type: "SecretsManager", layer: "Data",
      parentId: "group_aws", position: { x: 750, y: 280, z: 0 },
      metadata: { description: "Secure credential vault for API Keys and DB URI." }
    },
    {
      id: "aurora", name: "Aurora Serverless v2", type: "RDS", layer: "Data",
      parentId: "group_aws", position: { x: 750, y: 700, z: 0 },
      metadata: { specs: "PostgreSQL + pgvector", description: "Storage scaling automatically holding standard relational data and dense vectors." }
    },

    // --- EVENTBRIDGE SCHEDULER INNER NODES ---
    {
      id: "cron_cache", name: "cache_cleanup", type: "EventBridge", layer: "Automation",
      parentId: "group_eventbridge", position: { x: 30, y: 60, z: 0 },
      metadata: { description: "Purges stale Redis caches natively." }
    },
    {
      id: "cron_insights", name: "market_insights", type: "Activity", layer: "Automation",
      parentId: "group_eventbridge", position: { x: 150, y: 60, z: 0 },
      metadata: { description: "Aggregates new market trends off web scraping agents." }
    },
    {
      id: "cron_ssg", name: "ssg_sync (daily)", type: "EventBridge", layer: "Automation",
      parentId: "group_eventbridge", position: { x: 30, y: 160, z: 0 },
      metadata: { description: "Synchronizes course catalogs natively from SkillsFuture." }
    },
    {
      id: "cron_warmup", name: "lambda_warmup", type: "EventBridge", layer: "Automation",
      parentId: "group_eventbridge", position: { x: 150, y: 160, z: 0 },
      metadata: { description: "Pings cold lambdas hourly to avoid latency bumps." }
    },
    {
      id: "cron_backfill", name: "embedding_backfill", type: "Database", layer: "Automation",
      parentId: "group_eventbridge", position: { x: 90, y: 260, z: 0 },
      metadata: { description: "Post-generates embedding vectors for missing DB rows." }
    },

    // --- LLM PROVIDERS ---
    {
      id: "groq", name: "Groq (llama-3.3-70b)", type: "AI", layer: "AI",
      parentId: "group_llm", position: { x: 50, y: 50, z: 0 },
      metadata: { description: "Lightning fast LPU inferencing. Used for conversational tasks." }
    },
    {
      id: "claude", name: "Claude 3.5 Sonnet", type: "Library", layer: "AI",
      parentId: "group_llm", position: { x: 50, y: 150, z: 0 },
      metadata: { description: "Anthropic's flagship for reasoning and skill gap complex extraction." }
    },
    {
      id: "gemini", name: "Gemini 2.0 Flash", type: "AI", layer: "AI",
      parentId: "group_llm", position: { x: 50, y: 250, z: 0 },
      metadata: { description: "Versatile Google model for fast summarization fallbacks." }
    }
  ],
  edges: [
    { id: "e_user_cdf", source: "users", target: "cloudfront", label: "" },
    { id: "e_n8n_api", source: "n8n", target: "apigw", label: "workflow triggers" },
    { id: "e_cdf_s3", source: "cloudfront", target: "s3_static", label: "static assets" },
    { id: "e_cdf_api", source: "cloudfront", target: "apigw", label: "API requests" },
    
    { id: "e_apigw_lambda", source: "apigw", target: "lambda", label: "" },
    { id: "e_ecr_lambda", source: "ecr", target: "lambda", label: ".container image.", dashed: true },
    
    // Abstract edge from scheduler group to lambda (we'll connect group_eventbridge -> lambda natively if pos, or invisible proxy)
    { id: "e_cron_lambda", source: "group_eventbridge", target: "lambda", label: "invoke internal endpoints", dashed: true },
    
    { id: "e_lambda_cw", source: "lambda", target: "cloudwatch", label: "logs" },
    { id: "e_lambda_sm", source: "lambda", target: "secrets", label: "credentials" },
    { id: "e_lambda_rds", source: "lambda", target: "aurora", label: "data operations", dashed: true },
    
    { id: "e_lambda_groq", source: "lambda", target: "group_llm", label: "LLM requests", animated: true }
  ]
};
