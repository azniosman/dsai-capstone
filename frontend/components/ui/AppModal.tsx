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
          "flex flex-col gap-0 overflow-hidden bg-background-dark border border-primary/30 transition-all rounded-none",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[50%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[50%]",
          "duration-200 shadow-[0_0_30px_rgba(37,157,244,0.1)] fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]",
          sizeClasses[size],
          size === "full" &&
            "rounded-none w-screen h-screen sm:h-[95vh] sm:w-[95vw] max-w-none m-0",
          className,
        )}
        showCloseButton={!hideCloseButton}
      >
        <style>{`
          .corner-bracket::before {
              content: '';
              position: absolute;
              top: -1px;
              left: -1px;
              width: 10px;
              height: 10px;
              border-top: 2px solid #259df4;
              border-left: 2px solid #259df4;
          }
          .corner-bracket::after {
              content: '';
              position: absolute;
              bottom: -1px;
              right: -1px;
              width: 10px;
              height: 10px;
              border-bottom: 2px solid #259df4;
              border-right: 2px solid #259df4;
          }
        `}</style>
        <div className="absolute inset-0 corner-bracket pointer-events-none z-50"></div>
        <div
          className="absolute inset-0 pointer-events-none z-0 opacity-10"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(37, 157, 244, 0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(37, 157, 244, 0.2) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        ></div>

        {(title || description) && (
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-primary/20 shrink-0 relative z-10 bg-background-dark/95">
            <div className="absolute top-0 right-0 p-2 opacity-50 font-mono text-[10px] text-primary hidden sm:block pointer-events-none">
              MOD_ID: 49201A
            </div>
            {title && (
              <DialogTitle className="text-xl font-bold font-mono tracking-widest text-primary uppercase">
                {title}
              </DialogTitle>
            )}
            {description && (
              <DialogDescription className="text-xs font-mono text-primary/60 mt-2 uppercase tracking-wider">
                {description}
              </DialogDescription>
            )}
          </DialogHeader>
        )}

        {/* Content area */}
        <div
          className={cn(
            "flex-1 overflow-y-auto relative z-10 custom-scrollbar bg-background-dark/95",
            !noPadding && "p-6 sm:p-8",
          )}
        >
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 min-h-[200px]">
              <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
              <p className="text-[10px] font-mono tracking-widest text-primary uppercase animate-pulse">
                Accessing Nodes...
              </p>
            </div>
          ) : (
            children
          )}
        </div>

        {footer && (
          <DialogFooter className="px-6 py-4 border-t border-primary/20 bg-primary/5 shrink-0 relative z-10">
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
