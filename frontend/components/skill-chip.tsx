import { Badge } from "@/components/ui/badge";

const SEVERITY_CLASSES: Record<string, string> = {
  none: "border-green-500 text-green-700 bg-green-50",
  low: "border-blue-500 text-blue-700 bg-blue-50",
  medium: "border-orange-500 text-orange-700 bg-orange-50",
  high: "border-red-500 text-red-700 bg-red-50",
};

interface SkillChipProps {
  skill: string;
  severity?: string;
}

export default function SkillChip({ skill, severity }: SkillChipProps) {
  return (
    <Badge variant="outline" className={SEVERITY_CLASSES[severity || ""] || ""}>
      {skill}
    </Badge>
  );
}
