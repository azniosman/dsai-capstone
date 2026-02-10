import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, Alert, CircularProgress, Button, Paper, Grid, Chip } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import SchoolIcon from "@mui/icons-material/School";
import api from "../api/client";
import RoadmapTimeline from "../components/RoadmapTimeline";

export default function Roadmap() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const profileId = localStorage.getItem("profileId");

  useEffect(() => {
    if (!profileId) { navigate("/"); return; }
    api
      .get(`/api/upskilling/${profileId}`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.detail || "Failed to load roadmap"))
      .finally(() => setLoading(false));
  }, [navigate, profileId]);

  const downloadPdf = () => {
    window.open(`${api.defaults.baseURL || ""}/api/export/roadmap/${profileId}`, "_blank");
  };

  if (loading) return <CircularProgress sx={{ display: "block", mx: "auto", mt: 4 }} />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data?.roadmap?.length) return <Alert severity="info">No upskilling roadmap available yet.</Alert>;

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h5">Upskilling Roadmap</Typography>
        <Button variant="outlined" startIcon={<DownloadIcon />} onClick={downloadPdf}>
          Export PDF
        </Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <Paper sx={{ p: 2, textAlign: "center" }}>
            <Typography variant="h4" color="primary.main">{data.total_weeks}</Typography>
            <Typography variant="body2">Weeks ({Math.ceil(data.total_weeks / 4)} months)</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} md={3}>
          <Paper sx={{ p: 2, textAlign: "center" }}>
            <Typography variant="h4">{data.roadmap.length}</Typography>
            <Typography variant="body2">Courses</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} md={3}>
          <Paper sx={{ p: 2, textAlign: "center" }}>
            <Typography variant="h4" color="error.main">
              SGD {data.total_cost.toLocaleString()}
            </Typography>
            <Typography variant="body2">Total Course Fees</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} md={3}>
          <Paper sx={{ p: 2, textAlign: "center" }}>
            <Typography variant="h4" color="success.main">
              SGD {data.total_after_subsidy.toLocaleString()}
            </Typography>
            <Typography variant="body2">After Subsidy</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* SkillsFuture Credit Banner */}
      {data.total_skillsfuture_applicable > 0 && (
        <Alert severity="success" icon={<SchoolIcon />} sx={{ mb: 3 }}>
          <Typography variant="subtitle2">
            SkillsFuture Credit Applicable: SGD {data.total_skillsfuture_applicable.toLocaleString()}
          </Typography>
          <Typography variant="body2">
            You can use your SkillsFuture Credits to offset course fees. Most SCTP courses are eligible
            for up to SGD 500 in SkillsFuture Credits. Visit{" "}
            <a href="https://www.myskillsfuture.gov.sg" target="_blank" rel="noopener noreferrer">
              MySkillsFuture
            </a>{" "}
            to check your balance.
          </Typography>
        </Alert>
      )}

      <RoadmapTimeline items={data.roadmap} />
    </Box>
  );
}
