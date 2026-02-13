import React from "react";
import ReactDOM from "react-dom/client";
import { CssBaseline } from "@mui/material";
import App from "./App";
import SnackbarProvider from "./contexts/SnackbarContext";
import { TenantProvider } from "./contexts/TenantContext"; // Import TenantProvider
import ErrorBoundary from "./components/ErrorBoundary";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <TenantProvider> {/* Wrap App with TenantProvider */}
      <CssBaseline />
      <ErrorBoundary>
        <SnackbarProvider>
          <App />
        </SnackbarProvider>
      </ErrorBoundary>
    </TenantProvider>
  </React.StrictMode>
);
