import { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Chip,
  Typography,
  Alert,
} from "@mui/material";
import WorkIcon from "@mui/icons-material/Work";
import api from "../api/client";
import MatchScoreBar from "../components/MatchScoreBar";
import SkillChip from "../components/SkillChip";
import WorkflowStepper from "../components/WorkflowStepper";
import EmptyState from "../components/EmptyState";
import SkeletonCard from "../components/SkeletonCard";

const QUALITY_CHIP_PROPS = {
  strong: { color: "success", label: "Strong Match" },
  moderate: { color: "warning", label: "Moderate Match" },
  developing: { color: "default", label: "Developing" },
};

export default function Recommendations() {
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const profileId = localStorage.getItem("profileId");
    if (!profileId) {
      setLoading(false);
      return;
    }
    api
      .post("/api/recommend", { profile_id: parseInt(profileId) })
      .then((res) => setRecs(res.data.recommendations))
      .catch((err) => setError(err.response?.data?.detail || "Failed to get recommendations"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Box>
      <WorkflowStepper />
      <Typography variant="h5" gutterBottom>
        Recommended Job Roles
      </Typography>

      {loading && <SkeletonCard count={3} />}
      {error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && !localStorage.getItem("profileId") && (
        <EmptyState
          icon={<WorkIcon />}
          title="No profile yet"
          description="Create a profile to get personalized job recommendations based on your skills and experience."
        />
      )}

      {!loading && !error && recs.length > 0 && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {recs.map((rec) => {
            const quality = QUALITY_CHIP_PROPS[rec.skill_match_quality] || QUALITY_CHIP_PROPS.developing;
            return (
              <Card key={rec.role_id} sx={{ p: 3 }}>
                <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                    <Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                        <Typography variant="h6">{rec.title}</Typography>
                        <Chip label={quality.label} color={quality.color} size="small" />
                      </Box>
                      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                        <Chip label={rec.category} size="small" />
                        {rec.salary_range && (
                          <Chip label={rec.salary_range} size="small" variant="outlined" />
                        )}
                        {rec.career_switcher_bonus > 0 && (
                          <Chip
                            label="Career Switcher +"
                            size="small"
                            sx={{ bgcolor: "#00897b", color: "white" }}
                          />
                        )}
                      </Box>
                    </Box>
                  </Box>

                  <Box sx={{ mt: 2 }}>
                    <MatchScoreBar score={rec.match_score} label="Overall" />
                    <MatchScoreBar score={rec.content_score} label="Skills" />
                    <MatchScoreBar score={rec.rule_score} label="Profile Fit" />
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
            );
          })}
        </Box>
      )}
    </Box>
  );
}
