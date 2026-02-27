"use client";

import { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface AppModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  isLoading?: boolean;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  className?: string;
  hideCloseButton?: boolean;
  noPadding?: boolean;
}

const sizeClasses = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg md:max-w-2xl",
  xl: "sm:max-w-xl md:max-w-3xl lg:max-w-5xl",
  full: "sm:max-w-full w-[95vw] h-[95vh]",
};

export function AppModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  isLoading,
  size = "md",
  className,
  hideCloseButton = false,
  noPadding = false,
}: AppModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn(
          "flex flex-col gap-0 overflow-hidden glass-panel transition-all",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
          "duration-200 sm:rounded-[2rem]",
          sizeClasses[size],
          size === "full" &&
            "rounded-none w-screen h-screen sm:h-[95vh] sm:w-[95vw] max-w-none m-0",
          className,
        )}
        showCloseButton={!hideCloseButton}
      >
        {(title || description) && (
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/40 shrink-0">
            {title && (
              <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
            )}
            {description && (
              <DialogDescription className="text-sm font-medium mt-1.5">
                {description}
              </DialogDescription>
            )}
          </DialogHeader>
        )}

        {/* Content area */}
        <div
          className={cn(
            "flex-1 overflow-y-auto relative z-10 custom-scrollbar",
            !noPadding && "p-6",
          )}
        >
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 min-h-[200px]">
              <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
              <p className="text-sm font-medium text-muted-foreground animate-pulse">
                Loading...
              </p>
            </div>
          ) : (
            children
          )}
        </div>

        {footer && (
          <DialogFooter className="px-6 py-4 border-t border-border/40 bg-muted/20 shrink-0">
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
