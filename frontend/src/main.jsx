import React from "react";
import ReactDOM from "react-dom/client";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import App from "./App";
import SnackbarProvider from "./contexts/SnackbarContext";
import ErrorBoundary from "./components/ErrorBoundary";

const theme = createTheme({
  palette: {
    primary: { main: "#1565c0", dark: "#0d47a1" },
    secondary: { main: "#00897b" },
    background: { default: "#f5f7fa" },
  },
  typography: {
    fontFamily: "'Inter', sans-serif",
    h4: { fontWeight: 700, letterSpacing: "-0.02em" },
    h5: { fontWeight: 700, letterSpacing: "-0.01em" },
    h6: { fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiCard: {
      defaultProps: { variant: "outlined" },
      styleOverrides: {
        root: { borderRadius: 12, transition: "box-shadow 0.2s ease-in-out", "&:hover": { boxShadow: "0 4px 20px rgba(0,0,0,0.08)" } },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { borderRadius: 12 },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: "none", fontWeight: 600, borderRadius: 8 },
      },
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary>
        <SnackbarProvider>
          <App />
        </SnackbarProvider>
      </ErrorBoundary>
    </ThemeProvider>
  </React.StrictMode>
);
