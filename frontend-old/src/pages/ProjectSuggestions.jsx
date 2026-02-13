import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Card, CardContent, Chip, Alert, Grid,
} from "@mui/material";
import BuildIcon from "@mui/icons-material/Build";
import api from "../api/client";
import SkeletonCard from "../components/SkeletonCard";
import EmptyState from "../components/EmptyState";

const DIFFICULTY_COLORS = { beginner: "success", intermediate: "warning", advanced: "error" };

export default function ProjectSuggestions() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const profileId = localStorage.getItem("profileId");
    if (!profileId) { setLoading(false); return; }
    api.get(`/api/project-suggestions/${profileId}`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.detail || "Failed to load projects"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <SkeletonCard count={4} />;
  if (error) return <Alert severity="error">{error}</Alert>;

  if (!data?.suggestions?.length) {
    return (
      <EmptyState
        icon={<BuildIcon />}
        title="No project suggestions yet"
        description="Create a profile first to get personalized portfolio project ideas."
      />
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Portfolio Project Suggestions</Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Build these projects to demonstrate your skills to employers.
      </Typography>

      <Grid container spacing={3}>
        {data.suggestions.map((proj, i) => (
          <Grid item xs={12} md={6} key={i}>
            <Card sx={{ height: "100%", p: 3 }}>
              <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
                <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 1 }}>
                  <BuildIcon color="primary" />
                  <Typography variant="h6">{proj.title}</Typography>
                </Box>
                <Box sx={{ display: "flex", gap: 0.5, mb: 1 }}>
                  <Chip label={proj.skill} size="small" color="primary" />
                  <Chip label={proj.difficulty} size="small" color={DIFFICULTY_COLORS[proj.difficulty]} />
                  <Chip label={`~${proj.estimated_hours}h`} size="small" variant="outlined" />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {proj.description}
                </Typography>
                <Typography variant="caption" fontWeight="bold">Technologies:</Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5, mb: 1 }}>
                  {proj.technologies.map((t) => (
                    <Chip key={t} label={t} size="small" variant="outlined" />
                  ))}
                </Box>
                <Typography variant="caption" fontWeight="bold">Learning Outcomes:</Typography>
                <Box sx={{ mt: 0.5 }}>
                  {proj.learning_outcomes.map((o) => (
                    <Typography key={o} variant="caption" display="block">
                      - {o}
                    </Typography>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
