"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaPath?: string;
}

export default function EmptyState({
  icon,
  title,
  description,
  ctaLabel = "Create a Profile",
  ctaPath = "/",
}: EmptyStateProps) {
  const router = useRouter();

  return (
    <div className="text-center py-16">
      {icon && (
        <div className="mb-4 text-muted-foreground flex justify-center [&_svg]:h-16 [&_svg]:w-16">
          {icon}
        </div>
      )}
      <h2 className="text-xl font-bold mb-2">{title}</h2>
      <p className="text-muted-foreground mb-6 max-w-sm mx-auto">{description}</p>
      <Button size="lg" onClick={() => router.push(ctaPath)}>
        {ctaLabel}
      </Button>
    </div>
  );
}
