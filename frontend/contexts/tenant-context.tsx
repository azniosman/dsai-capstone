"use client";

import React, { createContext, useState, useEffect, useContext } from "react";

interface TenantConfig {
  name: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
}

interface TenantContextValue {
  tenantConfig: TenantConfig;
  setTenantConfig: React.Dispatch<React.SetStateAction<TenantConfig>>;
}

const defaultConfig: TenantConfig = {
  name: "SkillBridge AI",
  logoUrl: "",
  primaryColor: "#1565c0",
  secondaryColor: "#00897b",
};

export const TenantContext = createContext<TenantContextValue>({
  tenantConfig: defaultConfig,
  setTenantConfig: () => { },
});

export function useTenant() {
  return useContext(TenantContext);
}

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenantConfig, setTenantConfig] = useState<TenantConfig>(defaultConfig);

  useEffect(() => {
    const mockTenantName = localStorage.getItem("tenantName") || "Global";
    if (mockTenantName === "Example Corp") {
      setTenantConfig({
        name: "Example Corp",
        logoUrl: "https://example.com/logo.png",
        primaryColor: "#FF5722",
        secondaryColor: "#607D8B",
      });
    } else {
      setTenantConfig(defaultConfig);
    }
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      root.style.setProperty("--tenant-primary", tenantConfig.primaryColor);
      root.style.setProperty("--tenant-secondary", tenantConfig.secondaryColor);
      root.style.setProperty(
        "--tenant-gradient",
        `linear-gradient(135deg, ${tenantConfig.primaryColor} 0%, ${tenantConfig.secondaryColor} 100%)`
      );
    }
  }, [tenantConfig]);

  return (
    <TenantContext.Provider value={{ tenantConfig, setTenantConfig }}>
      {children}
    </TenantContext.Provider>
  );
}
