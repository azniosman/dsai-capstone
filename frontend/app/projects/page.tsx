"use client";

import { useEffect, useState } from "react";
import { Wrench, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import SkeletonCard from "@/components/skeleton-card";
import EmptyState from "@/components/empty-state";
import api from "@/lib/api-client";

function difficultyVariant(d: string): "success" | "warning" | "destructive" | "outline" {
  const dl = d.toLowerCase();
  if (dl === "beginner") return "success";
  if (dl === "intermediate") return "warning";
  if (dl === "advanced") return "destructive";
  return "outline";
}

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
        <Card variant="highlight">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-sm text-primary font-medium">Generating custom project ideas with AI...</p>
            </div>
          </CardContent>
        </Card>
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
        description="Create a profile first to get personalised portfolio project ideas."
      />
    );
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="section-label mb-1">Portfolio Builder</p>
        <h1 className="text-2xl font-extrabold tracking-tight">Project Suggestions</h1>
        <p className="text-sm text-muted-foreground mt-1">
          AI-curated projects to help you close skill gaps and build a portfolio.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.suggestions.map((proj, i) => (
          <Card key={i} variant="data" className="flex flex-col h-full hover-lift">
            <CardContent className="p-5 flex flex-col h-full">
              <div className="flex items-start gap-2 mb-3">
                <Wrench className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <h2 className="font-bold text-sm leading-tight">{proj.title}</h2>
              </div>

              <div className="flex gap-1.5 mb-3 flex-wrap">
                <Badge variant="accent">{proj.skill}</Badge>
                <Badge variant={difficultyVariant(proj.difficulty)}>{proj.difficulty}</Badge>
                <Badge variant="outline" className="gap-1">
                  <Clock className="h-2.5 w-2.5" />~{proj.estimated_hours}h
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground mb-4 flex-grow leading-relaxed">{proj.description}</p>

              <div className="mt-auto space-y-3 border-t border-border pt-3">
                <div>
                  <p className="section-label mb-1.5">Technologies</p>
                  <div className="flex flex-wrap gap-1">
                    {proj.technologies.map((t) => (
                      <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="section-label mb-1.5">Learning Outcomes</p>
                  <ul className="space-y-0.5">
                    {proj.learning_outcomes.map((o) => (
                      <li key={o} className="text-xs text-muted-foreground flex gap-1.5">
                        <span className="text-primary shrink-0">▸</span>{o}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
