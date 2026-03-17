"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Database,
  FileText,
  ChevronDown,
  ChevronUp,
  Search,
  User,
  Briefcase,
  Award,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface RetrievedChunk {
  id: string;
  content: string;
  sourceType: "resume" | "job_description" | "course" | "market_data";
  similarity: number;
  metadata?: {
    title?: string;
    section?: string;
    date?: string;
  };
}

interface RAGContextPanelProps {
  chunks: RetrievedChunk[];
  isLoading?: boolean;
}

const sourceIcons = {
  resume: User,
  job_description: Briefcase,
  course: Award,
  market_data: Database,
};

const sourceLabels = {
  resume: "Resume",
  job_description: "Job Description",
  course: "Course",
  market_data: "Market Data",
};

const sourceColors = {
  resume: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  job_description: "bg-purple-500/10 text-purple-600 border-purple-500/30",
  course: "bg-green-500/10 text-green-600 border-green-500/30",
  market_data: "bg-orange-500/10 text-orange-600 border-orange-500/30",
};

export function RAGContextPanel({ chunks, isLoading }: RAGContextPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!chunks || chunks.length === 0) {
    return null;
  }

  return (
    <div className="my-3 border border-border/50 rounded-xl overflow-hidden bg-card/50">
      {/* Header */}
      <Button
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between p-3 h-auto hover:bg-muted/30 rounded-xl"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Database className="w-4 h-4 text-primary" />
          </div>
          <div className="text-left">
            <div className="text-xs font-bold text-foreground">
              {chunks.length} Document{chunks.length > 1 ? "s" : ""} Referenced
            </div>
            <div className="text-[10px] text-muted-foreground">
              AI used these sources to generate this response
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isLoading ? (
            <span className="text-[10px] text-muted-foreground animate-pulse">
              Retrieving...
            </span>
          ) : (
            <>
              <span className="text-[10px] text-muted-foreground">
                {Math.round(Math.max(...chunks.map(c => c.similarity)) * 100)}% top match
              </span>
              {isOpen ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </>
          )}
        </div>
      </Button>

      {/* Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-border/30 overflow-hidden"
          >
            <div className="p-3 space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
              {chunks.map((chunk, i) => {
                const Icon = sourceIcons[chunk.sourceType];
                const colorClass = sourceColors[chunk.sourceType];

                return (
                  <motion.div
                    key={chunk.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="p-3 rounded-lg bg-muted/30 border border-border/50 hover:border-primary/30 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-6 h-6 rounded flex items-center justify-center",
                          colorClass
                        )}>
                          <Icon className="w-3 h-3" />
                        </div>
                        <div>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[9px] px-1.5 py-0 h-4",
                              colorClass
                            )}
                          >
                            {sourceLabels[chunk.sourceType]}
                          </Badge>
                          {chunk.metadata?.section && (
                            <span className="text-[9px] text-muted-foreground ml-1.5">
                              • {chunk.metadata.section}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Search className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs font-mono font-bold text-primary">
                          {Math.round(chunk.similarity * 100)}%
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {chunk.content}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Mock data for demo purposes
export const MOCK_CHUNKS: RetrievedChunk[] = [
  {
    id: "chunk-1",
    content: "Led team of 5 engineers developing machine learning models for predictive maintenance using Python, TensorFlow, and AWS SageMaker...",
    sourceType: "resume",
    similarity: 0.92,
    metadata: {
      section: "Work Experience - Senior Engineer",
      date: "2022-Present",
    },
  },
  {
    id: "chunk-2",
    content: "Proficient in Python, Java, SQL, Docker, Kubernetes, AWS (EC2, S3, Lambda), CI/CD pipelines, and agile methodologies...",
    sourceType: "resume",
    similarity: 0.87,
    metadata: {
      section: "Technical Skills",
    },
  },
  {
    id: "chunk-3",
    content: "Requires 5+ years experience in software development, strong knowledge of cloud platforms (AWS/Azure/GCP), and experience with containerization...",
    sourceType: "job_description",
    similarity: 0.79,
    metadata: {
      title: "Senior Software Engineer",
      section: "Requirements",
    },
  },
];
