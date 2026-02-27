"use client";

import { useState } from "react";
import { GraduationCap, ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

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
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-3">
      {items.map((item, idx) => {
        const isOpen = expandedIdx === idx;
        const subsidyPct =
          item.course_fee > 0
            ? Math.round((1 - item.nett_fee_after_subsidy / item.course_fee) * 100)
            : 0;

        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <Card
              className={cn(
                "cursor-pointer transition-all duration-300",
                isOpen && "ring-1 ring-primary/30",
              )}
              onClick={() => setExpandedIdx(isOpen ? null : idx)}
            >
              <CardContent className="p-4">
                {/* ─── Main row ─── */}
                <div className="flex gap-4 items-start">
                  <div className="min-w-[80px] text-center bg-primary text-primary-foreground rounded-md p-2 shrink-0">
                    <span className="text-xs">Week</span>
                    <p className="text-lg font-bold">
                      {item.week_start === item.week_end
                        ? item.week_start
                        : `${item.week_start}–${item.week_end}`}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold">{item.course_title}</h3>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 text-muted-foreground shrink-0 mt-0.5 transition-transform duration-300",
                          isOpen && "rotate-180",
                        )}
                      />
                    </div>
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

                    {/* Compact fee preview when collapsed */}
                    {!isOpen && item.course_fee > 0 && (
                      <p className="text-xs text-muted-foreground mt-1.5">
                        SGD {item.course_fee.toLocaleString()} &rarr;{" "}
                        <span className="font-semibold" style={{ color: "hsl(145 60% 36%)" }}>
                          SGD {item.nett_fee_after_subsidy.toLocaleString()} after subsidy
                        </span>
                      </p>
                    )}
                    {item.url && !isOpen && (
                      <p className="text-sm mt-1.5">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Course details
                        </a>
                      </p>
                    )}
                  </div>
                </div>

                {/* ─── Expandable fee breakdown ─── */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.22, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 pt-4 border-t border-border/50">
                        {item.course_fee > 0 && (
                          <div className="grid grid-cols-3 gap-2 mb-3">
                            <div className="text-center p-3 bg-muted/40 rounded-lg">
                              <div className="text-sm font-extrabold" style={{ color: "hsl(5 78% 50%)" }}>
                                SGD {item.course_fee.toLocaleString()}
                              </div>
                              <div className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">
                                Course Fee
                              </div>
                            </div>
                            <div className="text-center p-3 bg-muted/40 rounded-lg">
                              <div className="text-sm font-extrabold" style={{ color: "hsl(40 90% 45%)" }}>
                                {subsidyPct}%
                              </div>
                              <div className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">
                                Subsidy
                              </div>
                            </div>
                            <div className="text-center p-3 bg-primary/10 rounded-lg">
                              <div className="text-sm font-extrabold text-primary">
                                SGD {item.nett_fee_after_subsidy.toLocaleString()}
                              </div>
                              <div className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">
                                You Pay
                              </div>
                            </div>
                          </div>
                        )}
                        {item.url && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View course on MySkillsFuture →
                          </a>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
