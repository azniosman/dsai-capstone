import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TenantProvider } from "@/contexts/tenant-context";
import ErrorBoundary from "@/components/error-boundary";
import Navbar from "@/components/layout/navbar";
import AppBreadcrumbs from "@/components/layout/breadcrumbs";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WorkD — Career Intelligence Platform",
  description: "AI-powered job matching, skill gap analysis, and personalized upskilling roadmaps for Singapore tech careers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <TenantProvider>
          <ErrorBoundary>
            <Navbar />
            <main className="container mx-auto py-6 px-4">
              <AppBreadcrumbs />
              {children}
            </main>
            <Toaster />
          </ErrorBoundary>
        </TenantProvider>
      </body>
    </html>
  );
}
