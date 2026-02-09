import { Box, Card, CardContent, Chip, Typography } from "@mui/material";

export default function RoadmapTimeline({ items }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {items.map((item, idx) => (
        <Card key={idx} variant="outlined">
          <CardContent sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
            <Box
              sx={{
                minWidth: 80,
                textAlign: "center",
                bgcolor: "primary.main",
                color: "white",
                borderRadius: 1,
                p: 1,
              }}
            >
              <Typography variant="caption">Week</Typography>
              <Typography variant="h6">
                {item.week_start === item.week_end
                  ? item.week_start
                  : `${item.week_start}-${item.week_end}`}
              </Typography>
            </Box>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="subtitle1" fontWeight="bold">
                {item.course_title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {item.provider} &middot; {item.duration_weeks} weeks &middot;{" "}
                {item.level}
              </Typography>
              <Box sx={{ mt: 1, display: "flex", gap: 1, flexWrap: "wrap" }}>
                <Chip label={item.skill} size="small" color="primary" variant="outlined" />
                {item.certification && (
                  <Chip label={item.certification} size="small" color="secondary" />
                )}
              </Box>
              {item.url && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  <a href={item.url} target="_blank" rel="noopener noreferrer">
                    Course details
                  </a>
                </Typography>
              )}
            </Box>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}
