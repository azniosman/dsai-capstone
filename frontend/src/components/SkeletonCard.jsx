import { Box, Card, CardContent, Skeleton } from "@mui/material";

export default function SkeletonCard({ count = 3 }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} sx={{ p: 3 }}>
          <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
            <Skeleton variant="rectangular" height={24} width="40%" sx={{ mb: 1.5, borderRadius: 1 }} />
            <Skeleton variant="text" width="90%" />
            <Skeleton variant="text" width="75%" />
            <Skeleton variant="text" width="60%" />
            <Box sx={{ display: "flex", gap: 1, mt: 1.5 }}>
              <Skeleton variant="rounded" width={60} height={24} />
              <Skeleton variant="rounded" width={80} height={24} />
              <Skeleton variant="rounded" width={70} height={24} />
            </Box>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}
