"use client";

import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

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

export default function GapTable({ gaps }: { gaps: Gap[] }) {
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
          {gaps.map((gap) => (
            <TableRow key={gap.skill}>
              <TableCell className="font-medium">{gap.skill}</TableCell>
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
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
