import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Paper, Alert, CircularProgress, Grid, Chip,
  LinearProgress,
} from "@mui/material";
import api from "../api/client";

export default function PeerComparison() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const profileId = localStorage.getItem("profileId");
    if (!profileId) { navigate("/"); return; }
    api.get(`/api/peer-comparison/${profileId}`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.detail || "Failed to load peer data"))
      .finally(() => setLoading(false));
  }, [navigate]);

  if (loading) return <CircularProgress sx={{ display: "block", mx: "auto", mt: 4 }} />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Peer Comparison</Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        See how your profile compares to others targeting similar roles.
      </Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle2">Your Profile</Typography>
        <Typography>Skills: {data.your_skills_count} &middot; Experience: {data.your_experience} years</Typography>
      </Paper>

      <Grid container spacing={3}>
        {data.peer_insights.map((peer) => (
          <Grid item xs={12} md={4} key={peer.role_title}>
            <Paper sx={{ p: 3, height: "100%" }}>
              <Typography variant="h6" gutterBottom>{peer.role_title}</Typography>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption">Skills Count (You vs Peers)</Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="body2" fontWeight="bold">{data.your_skills_count}</Typography>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min((data.your_skills_count / Math.max(peer.avg_skills_count, 1)) * 100, 100)}
                    sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                    color={data.your_skills_count >= peer.avg_skills_count ? "success" : "warning"}
                  />
                  <Typography variant="body2" color="text.secondary">{peer.avg_skills_count} avg</Typography>
                </Box>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption">Experience (You vs Peers)</Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="body2" fontWeight="bold">{data.your_experience}yr</Typography>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min((data.your_experience / Math.max(peer.avg_experience_years, 1)) * 100, 100)}
                    sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                    color={data.your_experience >= peer.avg_experience_years ? "success" : "warning"}
                  />
                  <Typography variant="body2" color="text.secondary">{peer.avg_experience_years}yr avg</Typography>
                </Box>
              </Box>

              <Typography variant="caption">Most Common Skills Among Peers</Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
                {peer.most_common_skills.map((s) => (
                  <Chip key={s} label={s} size="small" variant="outlined" />
                ))}
              </Box>

              <Box sx={{ mt: 2 }}>
                <Typography variant="caption">
                  Typical education: {peer.most_common_education} &middot;{" "}
                  {Math.round(peer.career_switcher_pct * 100)}% are career switchers
                </Typography>
                {peer.total_peers > 0 && (
                  <Typography variant="caption" display="block">
                    Based on {peer.total_peers} similar profiles
                  </Typography>
                )}
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
