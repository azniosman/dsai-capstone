import { Component } from "react";
import { Box, Card, CardContent, Typography, Button } from "@mui/material";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
          <Card sx={{ maxWidth: 400, textAlign: "center", p: 3 }}>
            <CardContent>
              <ErrorOutlineIcon sx={{ fontSize: 64, color: "error.main", mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                Something went wrong
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                An unexpected error occurred. Please try refreshing the page.
              </Typography>
              <Button
                variant="contained"
                onClick={() => {
                  this.setState({ hasError: false });
                  window.location.href = "/";
                }}
              >
                Go Home
              </Button>
            </CardContent>
          </Card>
        </Box>
      );
    }
    return this.props.children;
  }
}
