import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Chip,
  Typography,
  Alert,
  CircularProgress,
} from "@mui/material";
import api from "../api/client";
import MatchScoreBar from "../components/MatchScoreBar";
import SkillChip from "../components/SkillChip";

export default function Recommendations() {
  const navigate = useNavigate();
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const profileId = localStorage.getItem("profileId");
    if (!profileId) {
      navigate("/");
      return;
    }
    api
      .post("/api/recommend", { profile_id: parseInt(profileId) })
      .then((res) => setRecs(res.data.recommendations))
      .catch((err) => setError(err.response?.data?.detail || "Failed to get recommendations"))
      .finally(() => setLoading(false));
  }, [navigate]);

  if (loading) return <CircularProgress sx={{ display: "block", mx: "auto", mt: 4 }} />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Recommended Job Roles
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {recs.map((rec) => (
          <Card key={rec.role_id} variant="outlined">
            <CardContent>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                <Box>
                  <Typography variant="h6">{rec.title}</Typography>
                  <Chip label={rec.category} size="small" sx={{ mr: 1 }} />
                  {rec.salary_range && (
                    <Chip label={rec.salary_range} size="small" variant="outlined" />
                  )}
                </Box>
              </Box>

              <Box sx={{ mt: 2 }}>
                <MatchScoreBar score={rec.match_score} label="Overall" />
                <MatchScoreBar score={rec.content_score} label="Skills" />
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {rec.rationale}
              </Typography>

              <Box sx={{ mt: 2 }}>
                <Typography variant="caption">Matched Skills:</Typography>
                <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 0.5 }}>
                  {rec.matched_skills.map((s) => (
                    <SkillChip key={s} skill={s} severity="none" />
                  ))}
                </Box>
              </Box>

              {rec.missing_skills.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption">Missing Skills:</Typography>
                  <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 0.5 }}>
                    {rec.missing_skills.map((s) => (
                      <SkillChip key={s} skill={s} severity="high" />
                    ))}
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  );
}
