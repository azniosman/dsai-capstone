import { Box, LinearProgress, Typography } from "@mui/material";

export default function MatchScoreBar({ score, label }) {
  const pct = Math.round(score * 100);
  const color = pct >= 70 ? "success" : pct >= 40 ? "warning" : "error";

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      {label && (
        <Typography variant="body2" sx={{ minWidth: 80 }}>
          {label}
        </Typography>
      )}
      <LinearProgress
        variant="determinate"
        value={pct}
        color={color}
        sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
      />
      <Typography variant="body2" fontWeight="bold" sx={{ minWidth: 40 }}>
        {pct}%
      </Typography>
    </Box>
  );
}
