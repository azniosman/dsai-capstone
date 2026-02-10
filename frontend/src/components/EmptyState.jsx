import { Box, Typography, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";

export default function EmptyState({ icon, title, description, ctaLabel = "Create a Profile", ctaPath = "/" }) {
  const navigate = useNavigate();

  return (
    <Box sx={{ textAlign: "center", py: 8 }}>
      {icon && (
        <Box sx={{ mb: 2, color: "text.secondary", "& .MuiSvgIcon-root": { fontSize: 64 } }}>
          {icon}
        </Box>
      )}
      <Typography variant="h5" gutterBottom>
        {title}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: "auto" }}>
        {description}
      </Typography>
      <Button variant="contained" size="large" onClick={() => navigate(ctaPath)}>
        {ctaLabel}
      </Button>
    </Box>
  );
}
