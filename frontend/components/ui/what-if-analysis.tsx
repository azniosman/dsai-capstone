"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  X,
  Sparkles,
  ArrowUpRight,
  Target,
  Lightbulb,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface WhatIfAnalysisProps {
  isOpen: boolean;
  onClose: () => void;
  currentMatchScore: number;
  missingSkills: Array<{
    skill: string;
    gap_severity: string;
    user_level: number;
    required_level: string | number;
  }>;
  roleTitle: string;
}

interface SkillImpact {
  skill: string;
  scoreIncrease: number;
  newMatchScore: number;
  effort: "Low" | "Medium" | "High";
  timeToProficiency: string;
}

export function WhatIfAnalysis({
  isOpen,
  onClose,
  currentMatchScore,
  missingSkills,
  roleTitle,
}: WhatIfAnalysisProps) {
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());

  // Calculate potential impact for each skill
  const skillImpacts: SkillImpact[] = missingSkills.map((skill) => {
    // Parse required_level to number if it's a string
    const reqLevel = typeof skill.required_level === 'string' 
      ? parseFloat(skill.required_level) || 0 
      : skill.required_level;
    const userLevel = skill.user_level || 0;
    
    // Estimate score increase based on gap severity and required level
    const baseIncrease = skill.gap_severity === "high" ? 12 : skill.gap_severity === "medium" ? 7 : 3;
    const levelGap = reqLevel - userLevel;
    const scoreIncrease = Math.round(baseIncrease * levelGap * 0.5);
    
    return {
      skill: skill.skill,
      scoreIncrease,
      newMatchScore: Math.min(100, currentMatchScore + scoreIncrease),
      effort: (levelGap > 3 ? "High" : levelGap > 1.5 ? "Medium" : "Low") as "Low" | "Medium" | "High",
      timeToProficiency: levelGap > 3 ? "4-6 months" : levelGap > 1.5 ? "2-3 months" : "4-6 weeks",
    };
  }).sort((a, b) => b.scoreIncrease - a.scoreIncrease);

  // Calculate combined impact
  const combinedImpact = Array.from(selectedSkills).reduce((acc, skillName) => {
    const impact = skillImpacts.find(s => s.skill === skillName);
    return acc + (impact?.scoreIncrease || 0);
  }, 0);

  const projectedScore = Math.min(100, currentMatchScore + combinedImpact);

  const toggleSkill = (skillName: string) => {
    const newSet = new Set(selectedSkills);
    if (newSet.has(skillName)) {
      newSet.delete(skillName);
    } else {
      newSet.add(skillName);
    }
    setSelectedSkills(newSet);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-card border border-primary/20 rounded-2xl shadow-2xl">
              {/* Header */}
              <div className="sticky top-0 bg-card/95 backdrop-blur-md border-b border-primary/20 p-6 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/20 border border-primary/30 rounded-xl flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">
                      What-If Analysis
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      See how learning new skills affects your match score
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-8 w-8 hover:bg-primary/10"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Current Score Display */}
                <div className="bg-muted/30 rounded-xl p-5 border border-border/50">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                        Current Match for {roleTitle}
                      </p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-foreground">
                          {currentMatchScore}%
                        </span>
                        {selectedSkills.size > 0 && (
                          <>
                            <ArrowUpRight className="w-5 h-5 text-green-600" />
                            <span className="text-3xl font-black text-green-600">
                              {projectedScore}%
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {selectedSkills.size > 0 ? (
                        <Badge variant="success" className="text-sm px-3 py-1 h-auto">
                          +{combinedImpact}% Potential Increase
                        </Badge>
                      ) : (
                        <Badge variant="muted" className="text-sm px-3 py-1 h-auto">
                          Select skills to see impact
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Progress bar comparison */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Current</span>
                      <span className="text-muted-foreground">Projected</span>
                    </div>
                    <div className="relative h-4 bg-muted rounded-full overflow-hidden">
                      {/* Current score bar */}
                      <div
                        className="absolute left-0 top-0 h-full bg-primary transition-all duration-500"
                        style={{ width: `${currentMatchScore}%` }}
                      />
                      {/* Projected increase */}
                      {selectedSkills.size > 0 && (
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${combinedImpact}%` }}
                          className="absolute bg-green-600 h-full"
                          style={{ left: `${currentMatchScore}%` }}
                        >
                          <div className="w-full h-full bg-green-500/50 animate-pulse" />
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Skills to Learn */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Target className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Skills That Would Boost Your Score
                    </span>
                  </div>

                  <div className="space-y-3">
                    {skillImpacts.map((impact, i) => {
                      const isSelected = selectedSkills.has(impact.skill);
                      const effortColors = {
                        Low: "text-green-600 bg-green-500/10 border-green-500/30",
                        Medium: "text-amber-600 bg-amber-500/10 border-amber-500/30",
                        High: "text-red-600 bg-red-500/10 border-red-500/30",
                      };

                      return (
                        <motion.div
                          key={impact.skill}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className={cn(
                            "p-4 rounded-xl border-2 cursor-pointer transition-all",
                            isSelected
                              ? "border-primary bg-primary/10"
                              : "border-border/50 bg-muted/30 hover:border-primary/30"
                          )}
                          onClick={() => toggleSkill(impact.skill)}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1">
                              <div className={cn(
                                "w-6 h-6 rounded flex items-center justify-center shrink-0 mt-0.5",
                                isSelected
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted-foreground/20 text-muted-foreground"
                              )}>
                                {isSelected ? (
                                  <CheckCircle2 className="w-4 h-4" />
                                ) : (
                                  <div className="w-3 h-3 rounded-sm border-2 border-current" />
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-bold text-foreground">
                                    {impact.skill}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "text-[9px] px-1.5 py-0 h-4",
                                      effortColors[impact.effort]
                                    )}
                                  >
                                    {impact.effort} Effort
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Lightbulb className="w-3 h-3" />
                                    {impact.timeToProficiency}
                                  </span>
                                  <span className="flex items-center gap-1 text-primary font-bold">
                                    <TrendingUp className="w-3 h-3" />
                                    +{impact.scoreIncrease}% match
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-2xl font-black text-primary">
                                {impact.newMatchScore}%
                              </div>
                              <div className="text-[9px] text-muted-foreground uppercase">
                                New Score
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* Action Button */}
                {selectedSkills.size > 0 && (
                  <div className="border-t border-border/30 pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-muted-foreground">
                        {selectedSkills.size} skill{selectedSkills.size > 1 ? "s" : ""} selected
                      </span>
                      <span className="text-sm font-bold text-foreground">
                        Projected: {projectedScore}% match
                      </span>
                    </div>
                    <Button className="w-full bg-primary hover:bg-primary/90 h-12 rounded-xl">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Create Learning Path for Selected Skills
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Trigger button component
export function WhatIfTrigger({ onClick }: { onClick: () => void }) {
  return (
    <Button
      onClick={onClick}
      className="bg-primary/10 border border-primary text-primary hover:bg-primary hover:text-background-dark rounded-xl px-4 py-6 h-auto transition-all shadow-[0_0_15px_rgba(37,157,244,0.2)]"
    >
      <Sparkles className="w-5 h-5 mr-2" />
      <div className="text-left">
        <div className="text-xs font-bold uppercase tracking-wider">
          What-If Analysis
        </div>
        <div className="text-[10px] font-normal normal-case">
          See how learning new skills boosts your score
        </div>
      </div>
    </Button>
  );
}
