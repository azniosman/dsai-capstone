"use client";

import { useAuth } from "@/contexts/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Terminal } from "lucide-react";

/**
 * AuthGuard protects children by checking authentication state.
 * If not authenticated and not loading, it redirects to /login.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Pass the current URL as a redirect parameter
      const params = new URLSearchParams();
      params.set("redirect", pathname);
      router.replace(`/login?${params.toString()}`);
    }
  }, [isAuthenticated, isLoading, router, pathname]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background-dark text-primary">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full scale-150 animate-pulse"></div>
          <Terminal className="w-12 h-12 relative z-10 animate-bounce" />
        </div>
        <div className="mt-8 font-mono text-xs uppercase tracking-widest animate-pulse">
          Authenticating_Node...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Don't render anything while redirecting
  }

  return <>{children}</>;
}
