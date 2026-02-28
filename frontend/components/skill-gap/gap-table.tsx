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
  none: "bg-green-100 text-green-800 hover:bg-green-100",
  low: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  medium: "bg-orange-100 text-orange-800 hover:bg-orange-100",
  high: "bg-red-100 text-red-800 hover:bg-red-100",
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
    <div className="border rounded-lg overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Skill</TableHead>
            <TableHead>Required</TableHead>
            <TableHead>Your Level</TableHead>
            <TableHead>Gap</TableHead>
            <TableHead>Priority</TableHead>
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
                  "border-b transition-colors data-[state=selected]:bg-muted cursor-default",
                  isActive
                    ? "bg-primary/10"
                    : "hover:bg-muted/50",
                )}
                onMouseEnter={() => onHoverSkill?.(gap.skill)}
                onMouseLeave={() => onHoverSkill?.(null)}
              >
                <TableCell className={cn("font-medium transition-colors", isActive && "text-primary font-bold")}>
                  {gap.skill}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{gap.required_level}</Badge>
                </TableCell>
                <TableCell>{gap.user_level_label}</TableCell>
                <TableCell>
                  <Badge className={SEVERITY_CLASSES[gap.gap_severity] || ""}>
                    {gap.gap_severity}
                  </Badge>
                </TableCell>
                <TableCell>{gap.priority}</TableCell>
              </motion.tr>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
