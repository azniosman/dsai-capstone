import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TenantProvider } from "@/contexts/tenant-context";
import { ThemeProvider } from "@/components/theme-provider";
import ErrorBoundary from "@/components/error-boundary";
import { AppShell } from "@/components/layout/app-shell";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SkillBridge AI",
  description: "AI-Powered Career Intelligence Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <TenantProvider>
            <ErrorBoundary>
              <AppShell>
                {children}
              </AppShell>
              <Toaster />
            </ErrorBoundary>
          </TenantProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
