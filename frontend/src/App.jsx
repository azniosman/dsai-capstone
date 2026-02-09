import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { AppBar, Toolbar, Typography, Button, Container, Box } from "@mui/material";
import ProfileInput from "./pages/ProfileInput";
import Recommendations from "./pages/Recommendations";
import SkillGap from "./pages/SkillGap";
import Roadmap from "./pages/Roadmap";

export default function App() {
  return (
    <BrowserRouter>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Career Intelligence
          </Typography>
          <Button color="inherit" component={Link} to="/">
            Profile
          </Button>
          <Button color="inherit" component={Link} to="/recommendations">
            Jobs
          </Button>
          <Button color="inherit" component={Link} to="/skill-gap">
            Skill Gap
          </Button>
          <Button color="inherit" component={Link} to="/roadmap">
            Roadmap
          </Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg">
        <Box sx={{ mt: 4 }}>
          <Routes>
            <Route path="/" element={<ProfileInput />} />
            <Route path="/recommendations" element={<Recommendations />} />
            <Route path="/skill-gap" element={<SkillGap />} />
            <Route path="/roadmap" element={<Roadmap />} />
          </Routes>
        </Box>
      </Container>
    </BrowserRouter>
  );
}
