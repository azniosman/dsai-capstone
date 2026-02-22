"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api-client";

export function DemoToggle() {
  const [loading, setLoading] = useState(false);
  const [demoActive, setDemoActive] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleToggleDemo = async () => {
    setLoading(true);
    try {
      if (!demoActive) {
        // Activate demo mode
        const res = await api.post("/api/demo/preload");
        if (res.data?.status === "success") {
          localStorage.setItem("demo_mode_active", "true");
          setDemoActive(true);
          toast.success("Demo Mode Activated", {
            description:
              "Preloaded data is now active for instant UI responses.",
          });
          // Dispatch a custom event so other components can pick up the change without reloading
          window.dispatchEvent(new Event("demo-mode-toggled"));
        } else {
          throw new Error(res.data?.message || "Failed to activate demo mode");
        }
      } else {
        // Deactivate demo mode
        localStorage.removeItem("demo_mode_active");
        setDemoActive(false);
        toast.info("Demo Mode Deactivated", {
          description: "Returning to live production AWS backend.",
        });
        window.dispatchEvent(new Event("demo-mode-toggled"));
      }
    } catch (err: unknown) {
      const error = err as Error;
      toast.error("Demo Toggle Failed", {
        description: error.message || "Could not connect to the backend.",
      });
    } finally {
      setLoading(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col-reverse items-end gap-2">
      {/* Trigger Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="h-10 w-10 bg-background/80 backdrop-blur-md border border-border/50 text-muted-foreground hover:text-primary rounded-full flex items-center justify-center shadow-lg transition-colors group"
        aria-label="Demo Settings"
      >
        <Zap
          className={`h-4 w-4 transition-all duration-300 ${
            demoActive
              ? "text-amber-500 fill-amber-500/20 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]"
              : "group-hover:text-primary"
          }`}
        />
      </motion.button>

      {/* Flyout Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="bg-card/90 backdrop-blur-xl border border-border/50 rounded-2xl p-4 shadow-xl w-64 origin-bottom-right"
          >
            <div className="mb-3">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                Live Demo Mode
              </h4>
              <p className="text-xs text-muted-foreground mt-1 leading-snug">
                Bypass live AWS calls to ensure instant, pre-calculated
                responses during live presentations.
              </p>
            </div>

            <button
              disabled={loading}
              onClick={handleToggleDemo}
              className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                demoActive
                  ? "bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : demoActive ? (
                "Deactivate Demo Mode"
              ) : (
                "Activate Demo Mode"
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
