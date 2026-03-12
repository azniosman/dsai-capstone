"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Banknote,
  Calculator,
  CheckCircle2,
  X,
  GraduationCap,
  TrendingUp,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface SubsidyCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
}

const COURSE_FEE_TIERS = [
  { label: "Short Course (20-40 hrs)", min: 500, max: 2000 },
  { label: "Certificate (40-100 hrs)", min: 2000, max: 5000 },
  { label: "Professional Cert (100-200 hrs)", min: 5000, max: 10000 },
  { label: "Diploma (200+ hrs)", min: 10000, max: 20000 },
];

const SUBSIDY_RATES = {
  sctp: 0.70, // 70% for SkillsFuture Career Transition Programme
  sfCredit: 0.50, // 50% for SkillsFuture Credit
  wss: 0.90, // 90% for Workfare Skills Support
  midCareer: 0.70, // 70% for Mid-career Career Support
};

export function SubsidyCalculator({ isOpen, onClose }: SubsidyCalculatorProps) {
  const [courseFee, setCourseFee] = useState<string>("5000");
  const [isSCTP, setIsSCTP] = useState(true);
  const [isMidCareer, setIsMidCareer] = useState(false);
  const [hasSkillsFutureCredit, setHasSkillsFutureCredit] = useState(true);
  const [isWorkfareEligible, setIsWorkfareEligible] = useState(false);

  const fee = parseFloat(courseFee) || 0;

  // Calculate subsidies
  const calculations = (() => {
    let baseSubsidy = 0;
    let breakdown = [];

    // Base subsidy (SCTP or standard)
    if (isSCTP) {
      baseSubsidy = fee * SUBSIDY_RATES.sctp;
      breakdown.push({
        label: "SCTP Base Subsidy (70%)",
        amount: baseSubsidy,
      });
    } else if (isMidCareer) {
      baseSubsidy = fee * SUBSIDY_RATES.midCareer;
      breakdown.push({
        label: "Mid-Career Support (70%)",
        amount: baseSubsidy,
      });
    } else {
      baseSubsidy = fee * SUBSIDY_RATES.sfCredit;
      breakdown.push({
        label: "SkillsFuture Credit (50%)",
        amount: baseSubsidy,
      });
    }

    // Workfare top-up
    let workfareTopUp = 0;
    if (isWorkfareEligible) {
      const remainingAfterBase = fee - baseSubsidy;
      workfareTopUp = Math.min(remainingAfterBase * 0.20, fee * 0.20);
      breakdown.push({
        label: "Workfare Top-up (20%)",
        amount: workfareTopUp,
      });
    }

    // SkillsFuture Credit usage
    let sfCreditUsed = 0;
    if (hasSkillsFutureCredit && !isSCTP) {
      const remainingAfterBase = fee - baseSubsidy - workfareTopUp;
      sfCreditUsed = Math.min(remainingAfterBase, 500); // Max $500 SF Credit
      breakdown.push({
        label: "SkillsFuture Credit (up to $500)",
        amount: sfCreditUsed,
      });
    }

    const totalSubsidy = baseSubsidy + workfareTopUp + sfCreditUsed;
    const outOfPocket = Math.max(0, fee - totalSubsidy);
    const savingsPercent = fee > 0 ? (totalSubsidy / fee) * 100 : 0;

    return {
      baseSubsidy,
      workfareTopUp,
      sfCreditUsed,
      totalSubsidy,
      outOfPocket,
      savingsPercent,
      breakdown,
    };
  })();

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
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card border border-primary/20 rounded-2xl shadow-2xl">
              {/* Header */}
              <div className="sticky top-0 bg-card/95 backdrop-blur-md border-b border-primary/20 p-6 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/20 border border-primary/30 rounded-xl flex items-center justify-center">
                    <Calculator className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">
                      SkillsFuture Subsidy Calculator
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Estimate your course subsidies
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
                {/* Course Fee Input */}
                <div>
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 block">
                    Course Fee (SGD)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">
                      S$
                    </span>
                    <Input
                      type="number"
                      value={courseFee}
                      onChange={(e) => setCourseFee(e.target.value)}
                      className="pl-8 bg-muted/50 border-primary/30 h-12 text-lg font-bold"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {COURSE_FEE_TIERS.map((tier) => (
                      <Button
                        key={tier.label}
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCourseFee(String(Math.round((tier.min + tier.max) / 2)))
                        }
                        className="text-[10px] h-7 px-2 rounded-full border-primary/30 hover:bg-primary/10"
                      >
                        {tier.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Eligibility Options */}
                <div className="grid grid-cols-2 gap-4">
                  <div
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      isSCTP
                        ? "border-primary bg-primary/10"
                        : "border-border/50 bg-muted/30"
                    }`}
                    onClick={() => setIsSCTP(!isSCTP)}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <GraduationCap
                        className={`w-5 h-5 ${
                          isSCTP ? "text-primary" : "text-muted-foreground"
                        }`}
                      />
                      <span
                        className={`text-sm font-bold ${
                          isSCTP ? "text-primary" : "text-muted-foreground"
                        }`}
                      >
                        SCTP Eligible
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Career Transition Programme (70% subsidy)
                    </p>
                  </div>

                  <div
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      isMidCareer
                        ? "border-primary bg-primary/10"
                        : "border-border/50 bg-muted/30"
                    }`}
                    onClick={() => setIsMidCareer(!isMidCareer)}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp
                        className={`w-5 h-5 ${
                          isMidCareer ? "text-primary" : "text-muted-foreground"
                        }`}
                      />
                      <span
                        className={`text-sm font-bold ${
                          isMidCareer ? "text-primary" : "text-muted-foreground"
                        }`}
                      >
                        Mid-Career
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Age 40+ enhanced support
                    </p>
                  </div>

                  <div
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      isWorkfareEligible
                        ? "border-primary bg-primary/10"
                        : "border-border/50 bg-muted/30"
                    }`}
                    onClick={() => setIsWorkfareEligible(!isWorkfareEligible)}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Banknote
                        className={`w-5 h-5 ${
                          isWorkfareEligible
                            ? "text-primary"
                            : "text-muted-foreground"
                        }`}
                      />
                      <span
                        className={`text-sm font-bold ${
                          isWorkfareEligible
                            ? "text-primary"
                            : "text-muted-foreground"
                        }`}
                      >
                        Workfare
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Additional 20% top-up
                    </p>
                  </div>

                  <div
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      hasSkillsFutureCredit
                        ? "border-primary bg-primary/10"
                        : "border-border/50 bg-muted/30"
                    }`}
                    onClick={() => setHasSkillsFutureCredit(!hasSkillsFutureCredit)}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2
                        className={`w-5 h-5 ${
                          hasSkillsFutureCredit
                            ? "text-primary"
                            : "text-muted-foreground"
                        }`}
                      />
                      <span
                        className={`text-sm font-bold ${
                          hasSkillsFutureCredit
                            ? "text-primary"
                            : "text-muted-foreground"
                        }`}
                      >
                        SF Credit
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Use up to $500 credit
                    </p>
                  </div>
                </div>

                {/* Results */}
                <div className="bg-muted/30 rounded-xl p-5 border border-border/50">
                  <div className="flex items-center gap-2 mb-4">
                    <Info className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Estimated Breakdown
                    </span>
                  </div>

                  <div className="space-y-3 mb-4">
                    {calculations.breakdown.map((item, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-center text-sm"
                      >
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="font-bold text-green-600">
                          -S${item.amount.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-border/50 pt-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        Total Subsidies
                      </span>
                      <span className="text-xl font-bold text-green-600">
                        -S${calculations.totalSubsidy.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-foreground">
                        Out of Pocket
                      </span>
                      <span className="text-2xl font-black text-foreground">
                        S${calculations.outOfPocket.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Savings Badge */}
                  <div className="mt-4 flex items-center justify-center">
                    <Badge
                      variant="success"
                      className="text-sm px-4 py-2 h-auto"
                    >
                      You save {Math.round(calculations.savingsPercent)}%
                    </Badge>
                  </div>
                </div>

                {/* Info Note */}
                <div className="bg-primary/5 rounded-xl p-4 border border-primary/20">
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    <span className="font-bold text-primary">Note:</span>{" "}
                    Actual subsidy amounts may vary based on course approval,
                    training provider, and individual eligibility. This calculator
                    provides estimates based on standard SkillsFuture Singapore
                    subsidy rates for SCTP-approved courses.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Trigger button component
export function SubsidyCalculatorTrigger({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <Button
      onClick={onClick}
      className="bg-primary/10 border border-primary text-primary hover:bg-primary hover:text-background-dark rounded-xl px-4 py-6 h-auto transition-all shadow-[0_0_15px_rgba(37,157,244,0.2)]"
    >
      <Calculator className="w-5 h-5 mr-2" />
      <div className="text-left">
        <div className="text-xs font-bold uppercase tracking-wider">
          Calculate Subsidy
        </div>
        <div className="text-[10px] font-normal normal-case">
          Estimate your course savings
        </div>
      </div>
    </Button>
  );
}
