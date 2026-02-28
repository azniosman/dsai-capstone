import type React from "react";
import { Badge } from "@/components/ui/badge";
import { CHART_STATUS } from "@/lib/chart-colors";

const SEVERITY_STYLES: Record<string, React.CSSProperties> = {
  none:   { borderColor: CHART_STATUS.success, color: CHART_STATUS.success },
  low:    { borderColor: CHART_STATUS.info,    color: CHART_STATUS.info    },
  medium: { borderColor: CHART_STATUS.warning, color: CHART_STATUS.warning },
  high:   { borderColor: CHART_STATUS.error,   color: CHART_STATUS.error   },
};

interface SkillChipProps {
  skill: string;
  severity?: string;
}

export default function SkillChip({ skill, severity }: SkillChipProps) {
  return (
    <Badge variant="outline" style={SEVERITY_STYLES[severity || ""] || {}}>
      {skill}
    </Badge>
  );
}
