import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Chip,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import api from "../api/client";

const COMMON_SKILLS = [
  "Python", "JavaScript", "SQL", "React", "Docker", "AWS",
  "Pandas", "TensorFlow", "Kubernetes", "Java", "Node.js", "PostgreSQL",
];

export default function ProfileInput() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    education: "bachelor",
    years_experience: 0,
    skills: [],
    resume_text: "",
    is_career_switcher: false,
  });
  const [customSkill, setCustomSkill] = useState("");
  const [loading, setLoading] = useState(false);

  const toggleSkill = (skill) => {
    setForm((prev) => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter((s) => s !== skill)
        : [...prev.skills, skill],
    }));
  };

  const addCustomSkill = () => {
    if (customSkill.trim() && !form.skills.includes(customSkill.trim())) {
      setForm((prev) => ({ ...prev, skills: [...prev.skills, customSkill.trim()] }));
      setCustomSkill("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/api/profile", form);
      localStorage.setItem("profileId", res.data.id);
      navigate("/recommendations");
    } catch (err) {
      console.error("Failed to create profile:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 4, maxWidth: 700, mx: "auto" }}>
      <Typography variant="h5" gutterBottom>
        Your Profile
      </Typography>
      <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField
          label="Name"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />

        <FormControl>
          <InputLabel>Education</InputLabel>
          <Select
            value={form.education}
            label="Education"
            onChange={(e) => setForm({ ...form, education: e.target.value })}
          >
            <MenuItem value="diploma">Diploma</MenuItem>
            <MenuItem value="bachelor">Bachelor&apos;s</MenuItem>
            <MenuItem value="master">Master&apos;s</MenuItem>
            <MenuItem value="phd">PhD</MenuItem>
          </Select>
        </FormControl>

        <TextField
          label="Years of Experience"
          type="number"
          inputProps={{ min: 0 }}
          value={form.years_experience}
          onChange={(e) => setForm({ ...form, years_experience: parseInt(e.target.value) || 0 })}
        />

        <FormControlLabel
          control={
            <Switch
              checked={form.is_career_switcher}
              onChange={(e) => setForm({ ...form, is_career_switcher: e.target.checked })}
            />
          }
          label="I am a career switcher"
        />

        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Select your skills:
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {COMMON_SKILLS.map((skill) => (
              <Chip
                key={skill}
                label={skill}
                color={form.skills.includes(skill) ? "primary" : "default"}
                onClick={() => toggleSkill(skill)}
                variant={form.skills.includes(skill) ? "filled" : "outlined"}
              />
            ))}
          </Box>
          <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
            <TextField
              size="small"
              placeholder="Add custom skill..."
              value={customSkill}
              onChange={(e) => setCustomSkill(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomSkill())}
            />
            <Button variant="outlined" size="small" onClick={addCustomSkill}>
              Add
            </Button>
          </Box>
        </Box>

        <TextField
          label="Paste Resume Text (optional)"
          multiline
          rows={6}
          value={form.resume_text}
          onChange={(e) => setForm({ ...form, resume_text: e.target.value })}
        />

        <Button type="submit" variant="contained" size="large" disabled={loading}>
          {loading ? "Analyzing..." : "Get Recommendations"}
        </Button>
      </Box>
    </Paper>
  );
}
