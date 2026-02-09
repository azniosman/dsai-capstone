import { Chip } from "@mui/material";

const SEVERITY_COLORS = {
  none: "success",
  low: "info",
  medium: "warning",
  high: "error",
};

export default function SkillChip({ skill, severity }) {
  return (
    <Chip
      label={skill}
      size="small"
      color={SEVERITY_COLORS[severity] || "default"}
      variant="outlined"
    />
  );
}
