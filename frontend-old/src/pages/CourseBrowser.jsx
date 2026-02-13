import { useEffect, useState } from "react";
import {
  Box, Card, CardContent, Chip, FormControl, InputLabel, MenuItem,
  Select, TextField, Typography, Alert, Switch, FormControlLabel,
} from "@mui/material";
import api from "../api/client";
import SkeletonCard from "../components/SkeletonCard";

export default function CourseBrowser() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [provider, setProvider] = useState("");
  const [level, setLevel] = useState("");
  const [mcesOnly, setMcesOnly] = useState(false);
  const [skillSearch, setSkillSearch] = useState("");

  // Derived provider list
  const [providers, setProviders] = useState([]);

  useEffect(() => {
    fetchCourses();
  }, [provider, level, mcesOnly]);

  const fetchCourses = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (provider) params.provider = provider;
      if (level) params.level = level;
      if (mcesOnly) params.mces_eligible = true;
      const res = await api.get("/api/courses", { params });
      setCourses(res.data.courses);
      // Extract unique providers from full (unfiltered) list on first load
      if (providers.length === 0 && res.data.courses.length > 0) {
        const uniqueProviders = [...new Set(res.data.courses.map((c) => c.provider))].sort();
        setProviders(uniqueProviders);
      }
    } catch {
      setError("Failed to load courses.");
    } finally {
      setLoading(false);
    }
  };

  const filtered = skillSearch
    ? courses.filter((c) =>
        c.skills_taught.some((s) => s.toLowerCase().includes(skillSearch.toLowerCase()))
      )
    : courses;

  return (
    <Box>
      <Typography variant="h5" gutterBottom>SCTP Course Browser</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Browse SkillsFuture Career Transition Programme courses with real-time subsidy calculations.
      </Typography>

      {/* Filters */}
      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap", alignItems: "center" }}>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Provider</InputLabel>
          <Select value={provider} label="Provider" onChange={(e) => setProvider(e.target.value)}>
            <MenuItem value="">All Providers</MenuItem>
            {providers.map((p) => (
              <MenuItem key={p} value={p}>{p}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Level</InputLabel>
          <Select value={level} label="Level" onChange={(e) => setLevel(e.target.value)}>
            <MenuItem value="">All Levels</MenuItem>
            <MenuItem value="beginner">Beginner</MenuItem>
            <MenuItem value="intermediate">Intermediate</MenuItem>
            <MenuItem value="advanced">Advanced</MenuItem>
          </Select>
        </FormControl>

        <FormControlLabel
          control={<Switch checked={mcesOnly} onChange={(e) => setMcesOnly(e.target.checked)} size="small" />}
          label="MCES Eligible"
        />

        <TextField
          size="small"
          placeholder="Search by skill..."
          value={skillSearch}
          onChange={(e) => setSkillSearch(e.target.value)}
          sx={{ minWidth: 200 }}
        />
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && <SkeletonCard count={4} />}

      {!loading && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Showing {filtered.length} course{filtered.length !== 1 ? "s" : ""}
        </Typography>
      )}

      {!loading && !error && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {filtered.map((course) => (
            <Card key={course.id} sx={{ p: 3 }}>
              <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "start", flexWrap: "wrap", gap: 1 }}>
                  <Box>
                    <Typography variant="h6">{course.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {course.provider} &middot; {course.duration_weeks} weeks &middot; {course.level}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                    {course.mces_eligible && (
                      <Chip label="MCES Eligible" color="success" size="small" />
                    )}
                    {course.certification && (
                      <Chip label={course.certification} size="small" variant="outlined" />
                    )}
                  </Box>
                </Box>

                <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 1.5 }}>
                  {course.skills_taught.map((s) => (
                    <Chip key={s} label={s} size="small" variant="outlined" />
                  ))}
                </Box>

                <Box sx={{ display: "flex", gap: 3, mt: 2, flexWrap: "wrap" }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Course Fee</Typography>
                    <Typography variant="body1" fontWeight={600}>
                      ${course.course_fee.toLocaleString()}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Subsidy ({course.subsidy_percent}%)</Typography>
                    <Typography variant="body1" color="success.main" fontWeight={600}>
                      -${course.subsidy_amount.toLocaleString()}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">SFC Offset</Typography>
                    <Typography variant="body1" color="info.main" fontWeight={600}>
                      -${course.sfc_applicable.toLocaleString()}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">You Pay</Typography>
                    <Typography variant="body1" fontWeight={700} color="primary">
                      ${course.nett_payable.toLocaleString()}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );
}
