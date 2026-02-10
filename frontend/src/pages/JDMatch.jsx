import { useState } from "react";
import {
  Box, Button, Paper, TextField, Typography, Alert, CircularProgress, Chip,
} from "@mui/material";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import api from "../api/client";
import GapTable from "../components/GapTable";

const GAP_COLORS = { none: "#4caf50", low: "#2196f3", medium: "#ff9800", high: "#f44336" };

export default function JDMatch() {
  const [jd, setJd] = useState("");
  const [title, setTitle] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleMatch = async () => {
    const profileId = localStorage.getItem("profileId");
    if (!profileId) { setError("Create a profile first."); return; }
    if (!jd.trim()) { setError("Paste a job description."); return; }

    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/api/jd-match", {
        profile_id: parseInt(profileId),
        job_description: jd,
        job_title: title || null,
      });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to analyze JD");
    } finally {
      setLoading(false);
    }
  };

  const chartData = result?.gaps.map((g) => ({
    skill: g.skill, level: g.user_level, severity: g.gap_severity,
  })) || [];

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Job Description Match</Typography>
      <Paper sx={{ p: 3, mb: 3 }}>
        <TextField
          label="Job Title (optional)"
          fullWidth
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          label="Paste Job Description"
          multiline
          rows={8}
          fullWidth
          value={jd}
          onChange={(e) => setJd(e.target.value)}
          placeholder="Paste the full job description here..."
        />
        <Button
          variant="contained"
          onClick={handleMatch}
          disabled={loading}
          sx={{ mt: 2 }}
        >
          {loading ? <CircularProgress size={20} /> : "Analyze Match"}
        </Button>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {result && (
        <>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6">{result.job_title}</Typography>
            <Typography variant="h4" color={result.match_score >= 0.6 ? "success.main" : "warning.main"}>
              {Math.round(result.match_score * 100)}% Match
            </Typography>
            <Box sx={{ mt: 2, display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Typography variant="subtitle2">Extracted Skills:</Typography>
              {result.extracted_skills.map((s) => (
                <Chip key={s} label={s} size="small" variant="outlined" />
              ))}
            </Box>
          </Paper>

          {chartData.length > 0 && (
            <Box sx={{ height: 300, mb: 3 }}>
              <ResponsiveContainer>
                <BarChart data={chartData} layout="vertical" margin={{ left: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 1]} />
                  <YAxis type="category" dataKey="skill" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => `${Math.round(v * 100)}%`} />
                  <Bar dataKey="level" name="Your Level">
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={GAP_COLORS[entry.severity]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
          )}

          <GapTable gaps={result.gaps} />
        </>
      )}
    </Box>
  );
}
