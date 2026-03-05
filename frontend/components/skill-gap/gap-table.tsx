"use client";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const SEVERITY_CLASSES: Record<string, string> = {
  none: "bg-primary/10 border-primary/30 text-primary",
  low: "bg-amber-500/10 border-amber-500/30 text-amber-500",
  medium: "bg-orange-500/10 border-orange-500/30 text-orange-500",
  high: "bg-accent-coral/10 border-accent-coral/30 text-accent-coral",
};

interface Gap {
  skill: string;
  required_level: string;
  user_level_label: string;
  gap_severity: string;
  priority: string | number;
}

interface Props {
  gaps: Gap[];
  hoveredSkill?: string | null;
  onHoverSkill?: (skill: string | null) => void;
}

export default function GapTable({ gaps, hoveredSkill, onHoverSkill }: Props) {
  return (
    <div className="border border-primary/30 bg-background-dark/80 backdrop-blur-sm overflow-x-auto shadow-[0_0_15px_rgba(37,157,244,0.05)]">
      <Table>
        <TableHeader className="bg-primary/5">
          <TableRow className="border-b border-primary/20 hover:bg-transparent">
            <TableHead className="font-mono text-[9px] uppercase tracking-widest text-primary h-10">
              Node ID
            </TableHead>
            <TableHead className="font-mono text-[9px] uppercase tracking-widest text-primary h-10">
              Target Spec
            </TableHead>
            <TableHead className="font-mono text-[9px] uppercase tracking-widest text-primary h-10">
              Current Vol
            </TableHead>
            <TableHead className="font-mono text-[9px] uppercase tracking-widest text-primary h-10">
              Delta
            </TableHead>
            <TableHead className="font-mono text-[9px] uppercase tracking-widest text-primary h-10">
              Criticality
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {gaps.map((gap, index) => {
            const isActive = hoveredSkill === gap.skill;
            return (
              <motion.tr
                key={gap.skill}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "border-b border-primary/10 transition-colors data-[state=selected]:bg-primary/5 cursor-default group",
                  isActive ? "bg-primary/10" : "hover:bg-primary/5",
                )}
                onMouseEnter={() => onHoverSkill?.(gap.skill)}
                onMouseLeave={() => onHoverSkill?.(null)}
              >
                <TableCell
                  className={cn(
                    "font-mono text-xs text-white/80 transition-colors",
                    isActive && "text-primary font-bold",
                  )}
                >
                  <span className="opacity-0 group-hover:opacity-100 text-primary mr-2 transition-opacity">
                    &gt;
                  </span>
                  {gap.skill}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className="border-white/20 text-white/60 bg-transparent rounded-none font-mono text-[10px] tracking-wider px-2 py-0"
                  >
                    {gap.required_level}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-[11px] text-white/70">
                  {gap.user_level_label}
                </TableCell>
                <TableCell>
                  <Badge
                    className={cn(
                      "rounded-none font-mono text-[9px] uppercase tracking-widest px-2 py-0 border",
                      SEVERITY_CLASSES[gap.gap_severity] || "",
                    )}
                  >
                    {gap.gap_severity}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-[11px] text-white/70">
                  {gap.priority}
                </TableCell>
              </motion.tr>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
