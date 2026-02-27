"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Clock, BookOpen } from "lucide-react";
import type { SsgCourse } from "@/lib/api";

interface CourseCardProps {
  course: SsgCourse;
  rank?: number;
}

const SOURCE_LABELS: Record<SsgCourse["source"], { label: string; variant: "success" | "accent" | "secondary" }> = {
  live:    { label: "Live",    variant: "success" },
  cached:  { label: "Cached", variant: "accent" },
  seeded:  { label: "Offline", variant: "secondary" },
};

export function CourseCard({ course, rank }: CourseCardProps) {
  const fee = course.subsidisedFee ?? course.totalCostOfTrainingPerTrainee;
  const src = SOURCE_LABELS[course.source];

  return (
    <Card className="clay-card overflow-hidden group">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {rank !== undefined && (
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0 mt-0.5">
                {rank}
              </div>
            )}
            <div className="min-w-0">
              <h4 className="font-bold text-foreground group-hover:text-primary transition-colors text-sm leading-snug line-clamp-2">
                {course.title}
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {course.provider}
              </p>
            </div>
          </div>

          <Badge variant={src.variant} className="shrink-0 text-[0.6rem]">
            {src.label}
          </Badge>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
          {course.totalTrainingDurationHour && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {course.totalTrainingDurationHour}h
            </span>
          )}
          {course.modeOfTraining && (
            <span className="flex items-center gap-1">
              <BookOpen className="h-3 w-3" />
              {course.modeOfTraining}
            </span>
          )}
          {fee !== undefined && (
            <span className="ml-auto font-semibold text-foreground">
              S${fee.toLocaleString()}
              <span className="font-normal text-muted-foreground"> nett</span>
            </span>
          )}
        </div>

        {/* Skill chips */}
        {(course.skillsFrameworkSkillCodes?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {course.skillsFrameworkSkillCodes!.slice(0, 5).map((skill) => (
              <Badge
                key={skill}
                variant={course.matchedSkills?.includes(skill) ? "accent" : "secondary"}
                className="text-[0.6rem] px-1.5 py-0"
              >
                {skill}
              </Badge>
            ))}
            {(course.skillsFrameworkSkillCodes?.length ?? 0) > 5 && (
              <Badge variant="secondary" className="text-[0.6rem] px-1.5 py-0">
                +{course.skillsFrameworkSkillCodes!.length - 5}
              </Badge>
            )}
          </div>
        )}

        {/* CTA */}
        {course.url ? (
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs h-7 gap-1.5"
            asChild
          >
            <a href={course.url} target="_blank" rel="noopener noreferrer">
              View on MySkillsFuture
              <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs h-7 gap-1.5"
            asChild
          >
            <a
              href={`https://www.myskillsfuture.gov.sg/content/portal/en/training-exchange/course-directory.html?q=${encodeURIComponent(course.title)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Search MySkillsFuture
              <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
