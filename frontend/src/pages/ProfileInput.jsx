import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Button, Chip, FormControl, FormControlLabel, Grid, InputLabel, MenuItem,
  Paper, Select, Switch, TextField, Typography, Alert, CircularProgress,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DescriptionIcon from "@mui/icons-material/Description";
import WorkIcon from "@mui/icons-material/Work";
import SchoolIcon from "@mui/icons-material/School";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import { useSnackbar } from "../contexts/SnackbarContext";
import api from "../api/client";

const COMMON_SKILLS = [
  "Python", "JavaScript", "SQL", "React", "Docker", "AWS",
  "Pandas", "TensorFlow", "Kubernetes", "Java", "Node.js", "PostgreSQL",
  "TypeScript", "Go", "Spark", "PyTorch", "Azure", "GCP",
];

const HERO_FEATURES = [
  { icon: <DescriptionIcon sx={{ fontSize: 40 }} />, label: "Resume Parsing", desc: "AI-powered skill extraction from your resume" },
  { icon: <WorkIcon sx={{ fontSize: 40 }} />, label: "50+ Tech Roles", desc: "Comprehensive Singapore job market coverage" },
  { icon: <SchoolIcon sx={{ fontSize: 40 }} />, label: "SCTP Courses", desc: "SkillsFuture-eligible upskilling paths" },
];

export default function ProfileInput() {
  const navigate = useNavigate();
  const { showSuccess, showError } = useSnackbar();
  const formRef = useRef(null);
  const [form, setForm] = useState({
    name: "",
    education: "bachelor",
    years_experience: 0,
    age: "",
    skills: [],
    resume_text: "",
    is_career_switcher: false,
  });
  const [customSkill, setCustomSkill] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      let profile = null;
      // If authenticated, try fetching the linked profile first
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const res = await api.get("/api/profile/me");
          profile = res.data;
          localStorage.setItem("profileId", profile.id);
        } catch {
          // No linked profile — fall through to localStorage
        }
      }
      // Fall back to localStorage profileId
      if (!profile) {
        const profileId = localStorage.getItem("profileId");
        if (profileId) {
          try {
            const res = await api.get(`/api/profile/${profileId}`);
            profile = res.data;
          } catch {
            // Profile not found
          }
        }
      }
      if (profile) {
        setForm({
          name: profile.name || "",
          education: profile.education || "bachelor",
          years_experience: profile.years_experience || 0,
          age: profile.age ?? "",
          skills: profile.skills || [],
          resume_text: "",
          is_career_switcher: profile.is_career_switcher || false,
        });
        setEditMode(true);
      }
    };
    loadProfile();
  }, []);

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

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/api/upload-resume", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setForm((prev) => ({
        ...prev,
        resume_text: res.data.text,
        skills: [...new Set([...prev.skills, ...res.data.skills])],
      }));
      showSuccess("Resume parsed successfully!");
    } catch (err) {
      setError("Failed to parse resume file. Try pasting text instead.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      ...form,
      age: form.age !== "" ? parseInt(form.age) : null,
    };

    try {
      if (editMode) {
        const profileId = localStorage.getItem("profileId");
        await api.patch(`/api/profile/${profileId}`, payload);
        showSuccess("Profile updated!");
        navigate("/recommendations");
      } else {
        const res = await api.post("/api/profile", payload);
        localStorage.setItem("profileId", res.data.id);
        showSuccess("Profile created! Fetching your job matches...");
        navigate("/recommendations");
      }
    } catch (err) {
      showError("Failed to save profile. Please try again.");
      setError("Failed to save profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #0d47a1 0%, #00897b 100%)",
          borderRadius: 3,
          color: "white",
          p: { xs: 4, md: 6 },
          mb: 4,
          textAlign: "center",
        }}
      >
        <Typography variant="h4" sx={{ mb: 1, fontWeight: 700 }}>
          Discover Your Next Tech Career in Singapore
        </Typography>
        <Typography variant="h6" sx={{ mb: 4, fontWeight: 400, opacity: 0.9 }}>
          AI-powered job matching, skill gap analysis, and personalized upskilling roadmaps
        </Typography>
        <Grid container spacing={3} justifyContent="center" sx={{ mb: 3 }}>
          {HERO_FEATURES.map((f) => (
            <Grid item xs={12} sm={4} key={f.label}>
              <Box sx={{ opacity: 0.95 }}>
                {f.icon}
                <Typography variant="subtitle1" fontWeight={600}>{f.label}</Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>{f.desc}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
        <Button
          variant="contained"
          size="large"
          onClick={scrollToForm}
          endIcon={<ArrowDownwardIcon />}
          sx={{ bgcolor: "white", color: "primary.dark", "&:hover": { bgcolor: "grey.100" } }}
        >
          Get Started
        </Button>
      </Box>

      {/* Profile Form */}
      <Paper ref={formRef} sx={{ p: 4, maxWidth: 700, mx: "auto" }}>
        <Typography variant="h5" gutterBottom>
          {editMode ? "Edit Your Profile" : "Your Profile"}
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
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

          <TextField
            label="Age (optional)"
            type="number"
            inputProps={{ min: 16, max: 100 }}
            value={form.age}
            onChange={(e) => setForm({ ...form, age: e.target.value })}
            helperText="Used for SkillsFuture subsidy eligibility (e.g. MCES for 40+)"
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

          {/* Resume file upload */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Upload Resume (PDF, DOCX, or TXT):
            </Typography>
            <Button
              variant="outlined"
              component="label"
              startIcon={uploading ? <CircularProgress size={16} /> : <CloudUploadIcon />}
              disabled={uploading}
            >
              {uploading ? "Parsing..." : "Upload File"}
              <input type="file" hidden accept=".pdf,.docx,.doc,.txt" onChange={handleFileUpload} />
            </Button>
          </Box>

          <TextField
            label="Or paste resume text"
            multiline
            rows={6}
            value={form.resume_text}
            onChange={(e) => setForm({ ...form, resume_text: e.target.value })}
          />

          <Button type="submit" variant="contained" size="large" disabled={loading}>
            {loading ? "Analyzing..." : editMode ? "Update Profile" : "Get Recommendations"}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
