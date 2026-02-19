"use client";

import * as React from "react";
import { Send, Paperclip, Mic, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface PromptInputProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  onPromptSubmit?: (value: string) => void;
  loading?: boolean;
}

export function PromptInput({
  className,
  onPromptSubmit,
  loading,
  ...props
}: PromptInputProps) {
  const [value, setValue] = React.useState("");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && onPromptSubmit) {
        onPromptSubmit(value);
        setValue("");
      }
    }
  };

  return (
    <div
      className={cn(
        "relative flex w-full flex-col rounded-xl border border-white/10 bg-background/50 ring-offset-background transition-all focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 hover:bg-background/80 dark:bg-white/5",
        className,
      )}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder="Ask SkillBridge..."
        className="min-h-[60px] w-full resize-none bg-transparent px-4 py-4 text-sm placeholder:text-muted-foreground/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        rows={1}
        {...props}
      />
      <div className="flex items-center justify-between px-3 pb-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground hover:text-foreground"
          >
            <Paperclip className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground hover:text-foreground"
          >
            <Mic className="size-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground/50 font-mono">
            {value.length > 0 && `${value.length} chars`}
          </span>
          <Button
            size="icon-sm"
            variant={value.trim() ? "default" : "secondary"}
            disabled={!value.trim() || loading}
            onClick={() => {
              if (value.trim() && onPromptSubmit) {
                onPromptSubmit(value);
                setValue("");
              }
            }}
            className={cn(
              "transition-all duration-200",
              value.trim()
                ? "bg-primary text-primary-foreground shadow-[0_0_10px_hsl(var(--primary)/0.5)]"
                : "opacity-50",
            )}
          >
            {loading ? (
              <Sparkles className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
