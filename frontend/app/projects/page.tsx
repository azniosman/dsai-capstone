"use client";

import { useEffect, useState } from "react";
import { Wrench } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import SkeletonCard from "@/components/skeleton-card";
import EmptyState from "@/components/empty-state";
import api from "@/lib/api-client";

const DIFFICULTY_CLASSES: Record<string, string> = {
  beginner: "bg-green-100 text-green-800 hover:bg-green-100",
  intermediate: "bg-orange-100 text-orange-800 hover:bg-orange-100",
  advanced: "bg-red-100 text-red-800 hover:bg-red-100",
};

interface Project {
  title: string;
  skill: string;
  difficulty: string;
  estimated_hours: number;
  description: string;
  technologies: string[];
  learning_outcomes: string[];
}

export default function ProjectSuggestions() {
  const [data, setData] = useState<{ suggestions: Project[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const profileId = localStorage.getItem("profileId");
    if (!profileId) { setLoading(false); return; }
    api.get(`/api/project-suggestions/${profileId}`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.detail || "Failed to load projects"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-900">
          <AlertDescription className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Analyzing your profile and generating custom project ideas with AI...
          </AlertDescription>
        </Alert>
        <SkeletonCard count={4} />
      </div>
    );
  }
  if (error) return <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>;

  if (!data?.suggestions?.length) {
    return (
      <EmptyState
        icon={<Wrench />}
        title="No project suggestions yet"
        description="Create a profile first to get personalized portfolio project ideas."
      />
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Portfolio Project Suggestions</h1>
      <p className="text-sm text-muted-foreground mb-6">
        AI-curated projects to help you close your skill gaps and build a portfolio.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {data.suggestions.map((proj, i) => (
          <Card key={i} className="h-full p-6 flex flex-col">
            <CardContent className="p-0 flex flex-col h-full">
              <div className="flex gap-2 items-center mb-2">
                <Wrench className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold leading-tight">{proj.title}</h2>
              </div>
              <div className="flex gap-1.5 mb-3 flex-wrap">
                <Badge className="bg-primary hover:bg-primary">{proj.skill}</Badge>
                <Badge className={DIFFICULTY_CLASSES[proj.difficulty.toLowerCase()] || ""}>{proj.difficulty}</Badge>
                <Badge variant="outline">~{proj.estimated_hours}h</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-4 flex-grow">{proj.description}</p>

              <div className="mt-auto">
                <p className="text-xs font-bold mb-1">Technologies:</p>
                <div className="flex flex-wrap gap-1 mb-3">
                  {proj.technologies.map((t) => (
                    <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                  ))}
                </div>
                <p className="text-xs font-bold mb-1">Learning Outcomes:</p>
                <div className="pl-2">
                  {proj.learning_outcomes.map((o) => (
                    <p key={o} className="text-xs text-muted-foreground list-item list-disc ml-2">{o}</p>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
