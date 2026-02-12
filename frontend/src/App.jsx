import { useState } from "react";
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import {
  AppBar, Toolbar, Typography, Button, Container, Box, IconButton,
  Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider,
  Avatar, Menu, MenuItem, Breadcrumbs, ListSubheader,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import PersonIcon from "@mui/icons-material/Person";
import WorkIcon from "@mui/icons-material/Work";
import BarChartIcon from "@mui/icons-material/BarChart";
import RouteIcon from "@mui/icons-material/Route";
import DescriptionIcon from "@mui/icons-material/Description";
import ChatIcon from "@mui/icons-material/Chat";
import QuizIcon from "@mui/icons-material/Quiz";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import CompareIcon from "@mui/icons-material/Compare";
import GroupIcon from "@mui/icons-material/Group";
import BuildIcon from "@mui/icons-material/Build";
import TimelineIcon from "@mui/icons-material/Timeline";
import LoginIcon from "@mui/icons-material/Login";
import SchoolIcon from "@mui/icons-material/School";
import HomeIcon from "@mui/icons-material/Home";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import SettingsIcon from "@mui/icons-material/Settings";

import ProfileInput from "./pages/ProfileInput";
import Recommendations from "./pages/Recommendations";
import SkillGap from "./pages/SkillGap";
import Roadmap from "./pages/Roadmap";
import JDMatch from "./pages/JDMatch";
import CareerChat from "./pages/CareerChat";
import MockInterview from "./pages/MockInterview";
import MarketInsights from "./pages/MarketInsights";
import RoleComparison from "./pages/RoleComparison";
import PeerComparison from "./pages/PeerComparison";
import ProjectSuggestions from "./pages/ProjectSuggestions";
import ProgressDashboard from "./pages/ProgressDashboard";
import Login from "./pages/Login";
import CourseBrowser from "./pages/CourseBrowser";
import AccountSettings from "./pages/AccountSettings";

const NAV_SECTIONS = [
  {
    header: "Core",
    items: [
      { label: "Profile", path: "/", icon: <PersonIcon /> },
      { label: "Jobs", path: "/recommendations", icon: <WorkIcon /> },
      { label: "Skill Gap", path: "/skill-gap", icon: <BarChartIcon /> },
      { label: "Roadmap", path: "/roadmap", icon: <RouteIcon /> },
    ],
  },
  {
    header: "Tools",
    items: [
      { label: "JD Match", path: "/jd-match", icon: <DescriptionIcon /> },
      { label: "Compare Roles", path: "/compare", icon: <CompareIcon /> },
      { label: "Career Coach", path: "/chat", icon: <ChatIcon /> },
      { label: "Mock Interview", path: "/interview", icon: <QuizIcon /> },
      { label: "Courses", path: "/courses", icon: <SchoolIcon /> },
    ],
  },
  {
    header: "Insights",
    items: [
      { label: "Market Insights", path: "/market", icon: <TrendingUpIcon /> },
      { label: "Peer Comparison", path: "/peers", icon: <GroupIcon /> },
      { label: "Projects", path: "/projects", icon: <BuildIcon /> },
      { label: "Progress", path: "/progress", icon: <TimelineIcon /> },
    ],
  },
  {
    header: "Account",
    items: [
      { label: "Settings", path: "/account", icon: <SettingsIcon /> },
    ],
  },
];

const ROUTE_LABELS = {
  "/": "Profile",
  "/recommendations": "Job Matches",
  "/skill-gap": "Skill Gaps",
  "/roadmap": "Roadmap",
  "/jd-match": "JD Match",
  "/compare": "Compare Roles",
  "/chat": "Career Coach",
  "/interview": "Mock Interview",
  "/market": "Market Insights",
  "/peers": "Peer Comparison",
  "/projects": "Projects",
  "/progress": "Progress",
  "/courses": "Courses",
  "/account": "Account Settings",
  "/login": "Login",
};

function NavDrawer({ open, onClose }) {
  const location = useLocation();
  return (
    <Drawer anchor="left" open={open} onClose={onClose}>
      <Box sx={{ width: 260, pt: 2 }}>
        <Typography variant="h6" sx={{ px: 2, mb: 1, fontWeight: 700 }}>
          WorkD
        </Typography>
        <Typography variant="caption" sx={{ px: 2, color: "text.secondary" }}>
          Career Intelligence Platform
        </Typography>
        <List>
          {NAV_SECTIONS.map((section) => (
            <Box key={section.header}>
              <ListSubheader sx={{ bgcolor: "transparent", fontWeight: 600, fontSize: "0.75rem", letterSpacing: "0.05em", textTransform: "uppercase", color: "text.secondary" }}>
                {section.header}
              </ListSubheader>
              {section.items.map((item) => (
                <ListItem key={item.path} disablePadding>
                  <ListItemButton
                    component={Link}
                    to={item.path}
                    selected={location.pathname === item.path}
                    onClick={onClose}
                    sx={{ borderRadius: 2, mx: 1 }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.label} />
                  </ListItemButton>
                </ListItem>
              ))}
            </Box>
          ))}
        </List>
      </Box>
    </Drawer>
  );
}

function AppBreadcrumbs() {
  const location = useLocation();
  const label = ROUTE_LABELS[location.pathname];

  if (location.pathname === "/") return null;

  return (
    <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 2 }}>
      <Typography
        component={Link}
        to="/"
        variant="body2"
        sx={{ color: "text.secondary", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
      >
        Home
      </Typography>
      <Typography variant="body2" color="text.primary" fontWeight={500}>
        {label || "Page"}
      </Typography>
    </Breadcrumbs>
  );
}

function UserMenu() {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const token = localStorage.getItem("token");
  const userName = localStorage.getItem("userName");

  if (!token) {
    return (
      <Button
        color="inherit"
        component={Link}
        to="/login"
        size="small"
        startIcon={<LoginIcon />}
      >
        Login
      </Button>
    );
  }

  const initials = userName
    ? userName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  const handleLogout = async () => {
    setAnchorEl(null);
    const refreshToken = localStorage.getItem("refreshToken");
    if (refreshToken) {
      try {
        const { default: api } = await import("./api/client");
        await api.post("/api/auth/logout", { refresh_token: refreshToken });
      } catch {
        // Ignore — clearing local state regardless
      }
    }
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("profileId");
    navigate("/");
  };

  return (
    <>
      <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ ml: 1 }}>
        <Avatar sx={{ width: 32, height: 32, bgcolor: "secondary.main", fontSize: "0.875rem" }}>
          {initials}
        </Avatar>
      </IconButton>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        <MenuItem disabled>
          <Typography variant="body2">{userName || "User"}</Typography>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { setAnchorEl(null); navigate("/"); }}>Profile</MenuItem>
        <MenuItem onClick={() => { setAnchorEl(null); navigate("/account"); }}>Account Settings</MenuItem>
        <MenuItem onClick={handleLogout}>Logout</MenuItem>
      </Menu>
    </>
  );
}

function AppContent() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <AppBar
        position="static"
        elevation={0}
        sx={{
          background: "linear-gradient(135deg, #0d47a1 0%, #00897b 100%)",
        }}
      >
        <Toolbar>
          <IconButton color="inherit" edge="start" onClick={() => setDrawerOpen(true)} sx={{ mr: 1 }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700, letterSpacing: "-0.01em" }}>
            WorkD
          </Typography>
          <Box sx={{ display: { xs: "none", md: "flex" }, gap: 0.5 }}>
            <Button color="inherit" component={Link} to="/" size="small">Profile</Button>
            <Button color="inherit" component={Link} to="/recommendations" size="small">Jobs</Button>
            <Button color="inherit" component={Link} to="/skill-gap" size="small">Gaps</Button>
            <Button color="inherit" component={Link} to="/roadmap" size="small">Roadmap</Button>
            <Button color="inherit" component={Link} to="/chat" size="small">Coach</Button>
          </Box>
          <UserMenu />
        </Toolbar>
      </AppBar>
      <NavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <Container maxWidth="lg">
        <Box sx={{ mt: 3, mb: 4 }}>
          <AppBreadcrumbs />
          <Routes>
            <Route path="/" element={<ProfileInput />} />
            <Route path="/recommendations" element={<Recommendations />} />
            <Route path="/skill-gap" element={<SkillGap />} />
            <Route path="/roadmap" element={<Roadmap />} />
            <Route path="/jd-match" element={<JDMatch />} />
            <Route path="/chat" element={<CareerChat />} />
            <Route path="/interview" element={<MockInterview />} />
            <Route path="/market" element={<MarketInsights />} />
            <Route path="/compare" element={<RoleComparison />} />
            <Route path="/peers" element={<PeerComparison />} />
            <Route path="/projects" element={<ProjectSuggestions />} />
            <Route path="/progress" element={<ProgressDashboard />} />
            <Route path="/courses" element={<CourseBrowser />} />
            <Route path="/account" element={<AccountSettings />} />
            <Route path="/login" element={<Login />} />
          </Routes>
        </Box>
      </Container>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
