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

const SEVERITY_CLASSES: Record<string, string> = {
  none: "bg-muted-cyan/10 border-muted-cyan/30 text-muted-cyan",
  low: "bg-amber-500/10 border-amber-500/30 text-amber-500",
  medium: "bg-orange-500/10 border-orange-500/30 text-orange-500",
  high: "bg-soft-coral/10 border-soft-coral/30 text-soft-coral",
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

import { motion } from "framer-motion";

export default function GapTable({ gaps, hoveredSkill, onHoverSkill }: Props) {
  return (
    <div className="border border-muted-cyan/30 bg-[#18181b] overflow-x-auto shadow-[0_0_15px_rgba(37,157,244,0.05)]">
      <Table>
        <TableHeader className="bg-muted-cyan/5">
          <TableRow className="border-b border-muted-cyan/20 hover:bg-transparent">
            <TableHead className="font-mono text-[9px] uppercase tracking-widest text-muted-cyan h-10">
              Node ID
            </TableHead>
            <TableHead className="font-mono text-[9px] uppercase tracking-widest text-muted-cyan h-10">
              Target Spec
            </TableHead>
            <TableHead className="font-mono text-[9px] uppercase tracking-widest text-muted-cyan h-10">
              Current Vol
            </TableHead>
            <TableHead className="font-mono text-[9px] uppercase tracking-widest text-muted-cyan h-10">
              Delta
            </TableHead>
            <TableHead className="font-mono text-[9px] uppercase tracking-widest text-muted-cyan h-10">
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
                  "border-b border-muted-cyan/10 transition-colors data-[state=selected]:bg-muted-cyan/5 cursor-default group",
                  isActive ? "bg-muted-cyan/10" : "hover:bg-muted-cyan/5",
                )}
                onMouseEnter={() => onHoverSkill?.(gap.skill)}
                onMouseLeave={() => onHoverSkill?.(null)}
              >
                <TableCell
                  className={cn(
                    "font-mono text-xs text-white/80 transition-colors",
                    isActive && "text-muted-cyan font-bold",
                  )}
                >
                  <span className="opacity-0 group-hover:opacity-100 text-muted-cyan mr-2 transition-opacity">
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
