import {
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";

const SEVERITY_COLORS = {
  none: "success",
  low: "info",
  medium: "warning",
  high: "error",
};

export default function GapTable({ gaps }) {
  return (
    <TableContainer component={Paper} variant="outlined" sx={{ overflowX: "auto" }}>
      <Table size="small" sx={{ minWidth: 600 }}>
        <TableHead>
          <TableRow>
            <TableCell>Skill</TableCell>
            <TableCell>Required</TableCell>
            <TableCell>Your Level</TableCell>
            <TableCell>Gap</TableCell>
            <TableCell>Priority</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {gaps.map((gap) => (
            <TableRow key={gap.skill}>
              <TableCell>{gap.skill}</TableCell>
              <TableCell>
                <Chip label={gap.required_level} size="small" variant="outlined" />
              </TableCell>
              <TableCell>{gap.user_level_label}</TableCell>
              <TableCell>
                <Chip
                  label={gap.gap_severity}
                  size="small"
                  color={SEVERITY_COLORS[gap.gap_severity]}
                />
              </TableCell>
              <TableCell>{gap.priority}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
