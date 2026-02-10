import { useLocation, useNavigate } from "react-router-dom";
import { Stepper, Step, StepButton, Box } from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import WorkIcon from "@mui/icons-material/Work";
import BarChartIcon from "@mui/icons-material/BarChart";
import RouteIcon from "@mui/icons-material/Route";

const STEPS = [
  { label: "Profile", path: "/", icon: <PersonIcon /> },
  { label: "Job Matches", path: "/recommendations", icon: <WorkIcon /> },
  { label: "Skill Gaps", path: "/skill-gap", icon: <BarChartIcon /> },
  { label: "Roadmap", path: "/roadmap", icon: <RouteIcon /> },
];

export default function WorkflowStepper() {
  const location = useLocation();
  const navigate = useNavigate();

  const activeStep = STEPS.findIndex((s) => s.path === location.pathname);

  return (
    <Box sx={{ mb: 4 }}>
      <Stepper activeStep={activeStep === -1 ? 0 : activeStep} alternativeLabel>
        {STEPS.map((step) => (
          <Step key={step.path} completed={activeStep > STEPS.indexOf(step)}>
            <StepButton onClick={() => navigate(step.path)}>
              {step.label}
            </StepButton>
          </Step>
        ))}
      </Stepper>
    </Box>
  );
}
