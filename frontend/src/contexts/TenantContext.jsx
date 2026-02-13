import React, { createContext, useState, useEffect } from "react";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";

export const TenantContext = createContext(null);

const defaultTheme = createTheme({
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

export const TenantProvider = ({ children }) => {
  const [tenantConfig, setTenantConfig] = useState({
    name: "WorkD",
    logoUrl: "",
    primaryColor: "#1565c0",
    secondaryColor: "#00897b",
  });
  const [currentTheme, setCurrentTheme] = useState(defaultTheme);

  // In a real application, you'd fetch tenant config from an API
  // based on hostname, subdomain, or user's tenant_id after login.
  // For this example, we'll simulate loading a tenant config.
  useEffect(() => {
    const fetchTenantConfig = async () => {
      // Simulate API call
      // const response = await api.get('/api/tenant/config');
      // setTenantConfig(response.data);

      // For demonstration, let's load a "mock" tenant for now.
      // In a real scenario, this would dynamically change based on context.
      const mockTenantName = localStorage.getItem("tenantName") || "Global"; 
      if (mockTenantName === "Example Corp") {
        setTenantConfig({
          name: "Example Corp",
          logoUrl: "https://example.com/logo.png", // Placeholder
          primaryColor: "#FF5722", // Orange
          secondaryColor: "#607D8B", // Blue Grey
        });
      } else {
        setTenantConfig({
          name: "WorkD",
          logoUrl: "",
          primaryColor: "#1565c0", 
          secondaryColor: "#00897b",
        });
      }
    };

    fetchTenantConfig();
  }, []);

  useEffect(() => {
    setCurrentTheme(createTheme({
      palette: {
        primary: { main: tenantConfig.primaryColor, dark: "#0d47a1" }, // Dark is hardcoded for now, can be computed
        secondary: { main: tenantConfig.secondaryColor },
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
    }));
  }, [tenantConfig]);


  return (
    <TenantContext.Provider value={{ tenantConfig, setTenantConfig }}>
      <ThemeProvider theme={currentTheme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </TenantContext.Provider>
  );
};
