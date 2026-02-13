import { useEffect, useState } from "react";
import {
  Box, Typography, Paper, Chip, Alert, Grid,
} from "@mui/material";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
} from "recharts";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import api from "../api/client";
import SkeletonCard from "../components/SkeletonCard";

const DEMAND_COLORS = { high: "#4caf50", medium: "#ff9800", low: "#f44336" };

export default function MarketInsights() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get("/api/market-insights")
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.detail || "Failed to load market data"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <SkeletonCard count={4} />;
  if (error) return <Alert severity="error">{error}</Alert>;

  const salaryData = data.insights.map((i) => ({
    category: i.role_category,
    salary: i.avg_salary_sgd,
    growth: i.yoy_growth_pct,
  }));

  const radarData = data.insights.map((i) => ({
    category: i.role_category.replace("&", "\n&"),
    demand: i.hiring_volume / 40,
    growth: i.yoy_growth_pct,
    salary: i.avg_salary_sgd / 200,
  }));

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Singapore Tech Market Insights</Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Top In-Demand Skills</Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {data.top_skills_overall.map((skill, i) => (
                <Chip
                  key={skill}
                  label={skill}
                  color={i < 3 ? "primary" : "default"}
                  icon={i < 3 ? <TrendingUpIcon /> : undefined}
                />
              ))}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Fastest Growing Sectors</Typography>
            {data.highest_demand_sectors.map((sector, i) => (
              <Typography key={sector} variant="body1">
                {i + 1}. {sector}
              </Typography>
            ))}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Average Monthly Salary (SGD)</Typography>
            <Box sx={{ height: 300 }} role="img" aria-label="Bar chart of average monthly salaries by tech category">
              <ResponsiveContainer>
                <BarChart data={salaryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                  <YAxis />
                  <Tooltip formatter={(v) => `SGD ${v.toLocaleString()}`} />
                  <Bar dataKey="salary" fill="#1565c0" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>YoY Growth (%)</Typography>
            <Box sx={{ height: 300 }} role="img" aria-label="Bar chart of year-over-year growth percentages by category">
              <ResponsiveContainer>
                <BarChart data={salaryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                  <YAxis />
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Bar dataKey="growth" fill="#00897b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Market Overview Radar</Typography>
            <Box sx={{ height: 350 }} role="img" aria-label="Radar chart showing market demand and growth across tech categories">
              <ResponsiveContainer>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="category" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis />
                  <Radar name="Demand" dataKey="demand" stroke="#1565c0" fill="#1565c0" fillOpacity={0.2} />
                  <Radar name="Growth %" dataKey="growth" stroke="#00897b" fill="#00897b" fillOpacity={0.2} />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {data.insights.map((ins) => (
          <Grid item xs={12} md={4} key={ins.role_category}>
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="subtitle1" fontWeight="bold">{ins.role_category}</Typography>
                <Chip label={ins.demand_level} size="small" sx={{ bgcolor: DEMAND_COLORS[ins.demand_level], color: "white" }} />
              </Box>
              <Typography variant="h6">SGD {ins.avg_salary_sgd.toLocaleString()}/mo</Typography>
              <Typography variant="body2" color="text.secondary">
                {ins.hiring_volume} openings &middot; {ins.yoy_growth_pct}% YoY growth
              </Typography>
              <Box sx={{ mt: 1, display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                {ins.trending_skills.slice(0, 4).map((s) => (
                  <Chip key={s} label={s} size="small" variant="outlined" />
                ))}
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
