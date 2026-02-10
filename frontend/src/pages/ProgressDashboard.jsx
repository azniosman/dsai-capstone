import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Paper, Alert, CircularProgress, Grid, Button,
  TextField, FormControl, InputLabel, Select, MenuItem, Chip,
} from "@mui/material";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import api from "../api/client";

export default function ProgressDashboard() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newSkill, setNewSkill] = useState("");
  const [newLevel, setNewLevel] = useState(0.5);

  const profileId = localStorage.getItem("profileId");

  useEffect(() => {
    if (!profileId) { navigate("/"); return; }
    loadData();
  }, [profileId, navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [progRes, timeRes] = await Promise.all([
        api.get(`/api/progress/${profileId}`),
        api.get(`/api/progress/${profileId}/timeline`),
      ]);
      setProgress(progRes.data);
      setTimeline(timeRes.data.timeline);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load progress");
    } finally {
      setLoading(false);
    }
  };

  const recordProgress = async () => {
    if (!newSkill.trim()) return;
    try {
      await api.post("/api/progress", {
        profile_id: parseInt(profileId),
        skill: newSkill.trim(),
        level: newLevel,
      });
      setNewSkill("");
      loadData();
    } catch (err) {
      setError("Failed to record progress");
    }
  };

  if (loading) return <CircularProgress sx={{ display: "block", mx: "auto", mt: 4 }} />;
  if (error) return <Alert severity="error">{error}</Alert>;

  // Group timeline by date for chart
  const dateMap = {};
  timeline.forEach((t) => {
    if (!t.date) return;
    if (!dateMap[t.date]) dateMap[t.date] = { date: t.date };
    dateMap[t.date][t.skill] = t.level;
  });
  const chartData = Object.values(dateMap);
  const allSkills = [...new Set(timeline.map((t) => t.skill))];

  const COLORS = ["#1976d2", "#9c27b0", "#4caf50", "#ff9800", "#f44336", "#00bcd4"];

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Progress Tracking</Typography>

      <Grid container spacing={3}>
        {/* Stats */}
        <Grid item xs={4}>
          <Paper sx={{ p: 3, textAlign: "center" }}>
            <Typography variant="h3" color="success.main">{progress?.skills_acquired || 0}</Typography>
            <Typography variant="body2">Skills Acquired</Typography>
          </Paper>
        </Grid>
        <Grid item xs={4}>
          <Paper sx={{ p: 3, textAlign: "center" }}>
            <Typography variant="h3" color="warning.main">{progress?.skills_in_progress || 0}</Typography>
            <Typography variant="body2">In Progress</Typography>
          </Paper>
        </Grid>
        <Grid item xs={4}>
          <Paper sx={{ p: 3, textAlign: "center" }}>
            <Typography variant="h3" color="primary.main">{progress?.skills_total || 0}</Typography>
            <Typography variant="body2">Total Tracked</Typography>
          </Paper>
        </Grid>

        {/* Record Progress */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Record Skill Progress</Typography>
            <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
              <TextField
                label="Skill Name"
                size="small"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                sx={{ flex: 1 }}
              />
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Level</InputLabel>
                <Select value={newLevel} label="Level" onChange={(e) => setNewLevel(e.target.value)}>
                  <MenuItem value={0.0}>Missing (0%)</MenuItem>
                  <MenuItem value={0.5}>Partial (50%)</MenuItem>
                  <MenuItem value={1.0}>Strong (100%)</MenuItem>
                </Select>
              </FormControl>
              <Button variant="contained" onClick={recordProgress}>Record</Button>
            </Box>
          </Paper>
        </Grid>

        {/* Timeline Chart */}
        {chartData.length > 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>Skill Progress Over Time</Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 1]} ticks={[0, 0.5, 1]} />
                    <Tooltip />
                    <Legend />
                    {allSkills.map((skill, i) => (
                      <Line
                        key={skill}
                        type="monotone"
                        dataKey={skill}
                        stroke={COLORS[i % COLORS.length]}
                        strokeWidth={2}
                        dot
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Grid>
        )}

        {/* History */}
        {progress?.entries?.length > 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>Recent Activity</Typography>
              {progress.entries.slice(0, 20).map((e, i) => (
                <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <Chip
                    label={e.skill}
                    size="small"
                    color={e.level >= 1.0 ? "success" : e.level >= 0.5 ? "warning" : "default"}
                  />
                  <Typography variant="body2">
                    {e.level >= 1.0 ? "Strong" : e.level >= 0.5 ? "Partial" : "Started"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">{e.recorded_at}</Typography>
                </Box>
              ))}
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
