import { useEffect, useState } from "react";
import {
  Box, Button, Chip, Paper, Typography, Alert, CircularProgress,
  FormControl, InputLabel, Select, MenuItem, OutlinedInput,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from "@mui/material";
import api from "../api/client";

const DIFFICULTY_COLORS = { easy: "success", moderate: "warning", hard: "error" };

export default function RoleComparison() {
  const [roles, setRoles] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get("/api/roles").then((res) => setRoles(res.data)).catch(() => {});
  }, []);

  const compare = async () => {
    const profileId = localStorage.getItem("profileId");
    if (!profileId) { setError("Create a profile first."); return; }
    if (selectedIds.length < 2) { setError("Select at least 2 roles."); return; }

    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/api/compare-roles", {
        profile_id: parseInt(profileId),
        role_ids: selectedIds,
      });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Comparison failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Compare Roles</Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Select 2-4 Roles</InputLabel>
          <Select
            multiple
            value={selectedIds}
            onChange={(e) => setSelectedIds(e.target.value.slice(0, 4))}
            input={<OutlinedInput label="Select 2-4 Roles" />}
            renderValue={(sel) => (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                {sel.map((id) => {
                  const r = roles.find((r) => r.id === id);
                  return <Chip key={id} label={r?.title || id} size="small" />;
                })}
              </Box>
            )}
          >
            {roles.map((r) => (
              <MenuItem key={r.id} value={r.id}>
                {r.title} ({r.category})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button variant="contained" onClick={compare} disabled={loading || selectedIds.length < 2}>
          {loading ? <CircularProgress size={20} /> : "Compare"}
        </Button>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {result && (
        <>
          <Paper sx={{ p: 3, mb: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold">Skills in Common</Typography>
            <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 1 }}>
              {result.common_skills.length > 0
                ? result.common_skills.map((s) => <Chip key={s} label={s} size="small" color="primary" />)
                : <Typography variant="body2" color="text.secondary">No common required skills</Typography>}
            </Box>
          </Paper>

          <TableContainer component={Paper} sx={{ overflowX: "auto", mb: 2 }}>
            <Table size="small" sx={{ minWidth: 600 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Attribute</TableCell>
                  {result.roles.map((r) => (
                    <TableCell key={r.role_id} align="center">{r.title}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>Match Score</TableCell>
                  {result.roles.map((r) => (
                    <TableCell key={r.role_id} align="center">
                      <Typography fontWeight="bold" color={r.match_score >= 0.6 ? "success.main" : "warning.main"}>
                        {Math.round(r.match_score * 100)}%
                      </Typography>
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell>Transition</TableCell>
                  {result.roles.map((r) => (
                    <TableCell key={r.role_id} align="center">
                      <Chip label={r.transition_difficulty} size="small" color={DIFFICULTY_COLORS[r.transition_difficulty]} />
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell>Salary</TableCell>
                  {result.roles.map((r) => (
                    <TableCell key={r.role_id} align="center">{r.salary_range || "N/A"}</TableCell>
                  ))}
                </TableRow>
                <TableRow sx={{ display: { xs: "none", md: "table-row" } }}>
                  <TableCell>Education</TableCell>
                  {result.roles.map((r) => (
                    <TableCell key={r.role_id} align="center">{r.education_level}</TableCell>
                  ))}
                </TableRow>
                <TableRow sx={{ display: { xs: "none", md: "table-row" } }}>
                  <TableCell>Min Experience</TableCell>
                  {result.roles.map((r) => (
                    <TableCell key={r.role_id} align="center">{r.min_experience_years} yrs</TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell>Career Switcher</TableCell>
                  {result.roles.map((r) => (
                    <TableCell key={r.role_id} align="center">
                      {r.career_switcher_friendly ? "Yes" : "No"}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell>Your Matched Skills</TableCell>
                  {result.roles.map((r) => (
                    <TableCell key={r.role_id} align="center">
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, justifyContent: "center" }}>
                        {r.matched_skills.map((s) => <Chip key={s} label={s} size="small" color="success" variant="outlined" />)}
                      </Box>
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell>Missing Skills</TableCell>
                  {result.roles.map((r) => (
                    <TableCell key={r.role_id} align="center">
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, justifyContent: "center" }}>
                        {r.missing_skills.map((s) => <Chip key={s} label={s} size="small" color="error" variant="outlined" />)}
                      </Box>
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight="bold">Unique Skills per Role</Typography>
            {Object.entries(result.unique_skills_per_role).map(([title, skills]) => (
              <Box key={title} sx={{ mt: 1 }}>
                <Typography variant="body2" fontWeight="bold">{title}:</Typography>
                <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                  {skills.length > 0
                    ? skills.map((s) => <Chip key={s} label={s} size="small" variant="outlined" />)
                    : <Typography variant="caption" color="text.secondary">None</Typography>}
                </Box>
              </Box>
            ))}
          </Paper>
        </>
      )}
    </Box>
  );
}
