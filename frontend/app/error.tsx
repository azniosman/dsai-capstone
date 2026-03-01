"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-md w-full border-border/40 shadow-xl">
        <CardContent className="p-8 text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">
              Something went wrong
            </h2>
            <p className="text-muted-foreground text-sm">
              We&apos;ve encountered an unexpected error. Our team has been
              notified.
            </p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg text-left overflow-hidden">
            <p className="text-xs font-mono text-muted-foreground break-all">
              {error.message || "An unknown error occurred"}
            </p>
          </div>
          <Button onClick={() => reset()} className="w-full gap-2" size="lg">
            <RotateCcw className="w-4 h-4" />
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
