import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { TenantProvider } from "@/contexts/tenant-context";
import { ThemeProvider } from "@/components/providers/theme-provider";
import ErrorBoundary from "@/components/layout/error-boundary";
import { AppShell } from "@/components/layout/app-shell";
import { Toaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/providers/QueryProvider";
import { ModalProvider } from "@/providers/ModalProvider";
import { AuthProvider } from "@/contexts/auth-context";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SKLBR - Career Intelligence",
  keywords: "SKILLBRIDGE, SKLBR, SKLBR_ANALYTICAL",
  description: "AI-Powered Career Intelligence Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head></head>
      <body
        className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} font-sans antialiased bg-background text-foreground min-h-dvh`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <QueryProvider>
            <AuthProvider>
              <TenantProvider>
                <ErrorBoundary>
                  <AppShell>{children}</AppShell>
                  <ModalProvider />
                  <Toaster />
                </ErrorBoundary>
              </TenantProvider>
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
