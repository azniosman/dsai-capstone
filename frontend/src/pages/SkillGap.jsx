import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, Alert, CircularProgress, Tabs, Tab, Paper, ToggleButton, ToggleButtonGroup } from "@mui/material";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
} from "recharts";
import api from "../api/client";
import GapTable from "../components/GapTable";

const GAP_COLORS = { none: "#4caf50", low: "#2196f3", medium: "#ff9800", high: "#f44336" };

export default function SkillGap() {
  const navigate = useNavigate();
  const [gaps, setGaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState(0);
  const [chartType, setChartType] = useState("radar");

  useEffect(() => {
    const profileId = localStorage.getItem("profileId");
    if (!profileId) {
      navigate("/");
      return;
    }
    api
      .get(`/api/skill-gap/${profileId}`)
      .then((res) => setGaps(res.data.gaps))
      .catch((err) => setError(err.response?.data?.detail || "Failed to load skill gaps"))
      .finally(() => setLoading(false));
  }, [navigate]);

  if (loading) return <CircularProgress sx={{ display: "block", mx: "auto", mt: 4 }} />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (gaps.length === 0) return <Alert severity="info">No gap analysis available. Submit a profile first.</Alert>;

  const currentGap = gaps[tab];
  const chartData = currentGap.gaps.map((g) => ({
    skill: g.skill,
    level: g.user_level,
    required: g.required_level === "required" ? 1.0 : 0.7,
    severity: g.gap_severity,
  }));

  // Radar data: show user level vs required level
  const radarData = currentGap.gaps.slice(0, 10).map((g) => ({
    skill: g.skill.length > 12 ? g.skill.slice(0, 12) + "..." : g.skill,
    "Your Level": Math.round(g.user_level * 100),
    "Required": g.required_level === "required" ? 100 : 70,
  }));

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Skill Gap Analysis</Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        {gaps.map((g, i) => (
          <Tab key={i} label={g.role_title} />
        ))}
      </Tabs>

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="subtitle1">
          {currentGap.role_title} — Match: {Math.round(currentGap.match_score * 100)}%
        </Typography>
        <ToggleButtonGroup value={chartType} exclusive onChange={(_, v) => v && setChartType(v)} size="small">
          <ToggleButton value="radar">Radar</ToggleButton>
          <ToggleButton value="bar">Bar</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ height: 350 }}>
          <ResponsiveContainer>
            {chartType === "radar" ? (
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis domain={[0, 100]} />
                <Radar name="Your Level" dataKey="Your Level" stroke="#1976d2" fill="#1976d2" fillOpacity={0.4} />
                <Radar name="Required" dataKey="Required" stroke="#f44336" fill="#f44336" fillOpacity={0.1} />
                <Legend />
              </RadarChart>
            ) : (
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
            )}
          </ResponsiveContainer>
        </Box>
      </Paper>

      <GapTable gaps={currentGap.gaps} />
    </Box>
  );
}
