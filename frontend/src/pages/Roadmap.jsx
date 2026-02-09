import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, Alert, CircularProgress } from "@mui/material";
import api from "../api/client";
import RoadmapTimeline from "../components/RoadmapTimeline";

export default function Roadmap() {
  const navigate = useNavigate();
  const [roadmap, setRoadmap] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const profileId = localStorage.getItem("profileId");
    if (!profileId) {
      navigate("/");
      return;
    }
    api
      .get(`/api/upskilling/${profileId}`)
      .then((res) => setRoadmap(res.data.roadmap))
      .catch((err) => setError(err.response?.data?.detail || "Failed to load roadmap"))
      .finally(() => setLoading(false));
  }, [navigate]);

  if (loading) return <CircularProgress sx={{ display: "block", mx: "auto", mt: 4 }} />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (roadmap.length === 0) return <Alert severity="info">No upskilling roadmap available yet.</Alert>;

  const totalWeeks = roadmap.length > 0 ? roadmap[roadmap.length - 1].week_end : 0;

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Upskilling Roadmap
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        Estimated timeline: {totalWeeks} weeks ({Math.ceil(totalWeeks / 4)} months)
      </Typography>
      <RoadmapTimeline items={roadmap} />
    </Box>
  );
}
