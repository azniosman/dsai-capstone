import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-black/50 border-border h-10 w-full min-w-0 rounded-none border-b-2 border-t-0 border-l-0 border-r-0 bg-transparent px-3 py-1 text-base shadow-none transition-all outline-none file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm font-mono tracking-wide",
        "focus-visible:border-primary focus-visible:shadow-[0_2px_10px_rgba(37,157,244,0.1)] focus-visible:bg-primary/5 ring-0 outline-none focus:outline-none focus:ring-0",
        "aria-invalid:border-destructive dark:aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
