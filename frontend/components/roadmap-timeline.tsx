"use client";

import { GraduationCap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface RoadmapItem {
  week_start: number;
  week_end: number;
  course_title: string;
  provider: string;
  duration_weeks: number;
  level: string;
  skill: string;
  certification?: string;
  skillsfuture_eligible?: boolean;
  skillsfuture_credit_amount?: number;
  course_fee: number;
  nett_fee_after_subsidy: number;
  url?: string;
}

export default function RoadmapTimeline({ items }: { items: RoadmapItem[] }) {
  return (
    <div className="flex flex-col gap-4">
      {items.map((item, idx) => (
        <Card key={idx}>
          <CardContent className="flex gap-4 items-start p-4">
            <div className="min-w-[80px] text-center bg-primary text-primary-foreground rounded-md p-2">
              <span className="text-xs">Week</span>
              <p className="text-lg font-bold">
                {item.week_start === item.week_end
                  ? item.week_start
                  : `${item.week_start}-${item.week_end}`}
              </p>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold">{item.course_title}</h3>
              <p className="text-sm text-muted-foreground">
                {item.provider} &middot; {item.duration_weeks} weeks &middot; {item.level}
              </p>
              <div className="mt-2 flex gap-1.5 flex-wrap">
                <Badge variant="outline" className="border-primary text-primary">
                  {item.skill}
                </Badge>
                {item.certification && (
                  <Badge className="bg-[#00897b] hover:bg-[#00897b]">{item.certification}</Badge>
                )}
                {item.skillsfuture_eligible && (
                  <Badge variant="outline" className="border-green-500 text-green-700">
                    <GraduationCap className="h-3 w-3 mr-1" />
                    SF Credit: SGD {item.skillsfuture_credit_amount}
                  </Badge>
                )}
              </div>
              {(item.course_fee > 0 || item.nett_fee_after_subsidy > 0) && (
                <p className="text-xs text-muted-foreground mt-1">
                  Fee: SGD {item.course_fee.toLocaleString()} &rarr; After subsidy: SGD{" "}
                  {item.nett_fee_after_subsidy.toLocaleString()}
                </p>
              )}
              {item.url && (
                <p className="text-sm mt-2">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Course details
                  </a>
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
