import * as React from "react"
import { cn } from "@/lib/utils"
import { Bot, Copy, RefreshCw, ThumbsUp, ThumbsDown, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

interface AIResponseProps extends React.HTMLAttributes<HTMLDivElement> {
    model?: string
    streaming?: boolean
    content?: string
}

export function AIResponse({ className, model = "SkillBridge 1.0", streaming, content, children, ...props }: AIResponseProps) {
    return (
        <div className={cn("group relative flex gap-4 p-4 rounded-xl hover:bg-white/5 transition-colors duration-200", className)} {...props}>
            <div className="mt-1 flex size-8 shrink-0 select-none items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary shadow-[0_0_15px_-3px_hsl(var(--primary)/0.3)]">
                {streaming ? <Sparkles className="size-4 animate-pulse" /> : <Bot className="size-4" />}
            </div>
            <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-primary/80">{model}</span>
                    {streaming && <span className="flex size-2 rounded-full bg-primary animate-pulse" />}
                </div>
                <div className="prose prose-sm dark:prose-invert prose-p:leading-relaxed prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10 max-w-none text-foreground/90 leading-relaxed">
                    {children || content}
                    {streaming && <span className="inline-block w-1.5 h-4 ml-1 bg-primary align-middle opacity-50 animate-pulse" />}
                </div>

                {/* Actions fade in on hover */}
                <div className="flex items-center gap-1 pt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <Button variant="ghost" size="icon-xs" className="text-muted-foreground hover:text-foreground" title="Copy">
                        <Copy className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon-xs" className="text-muted-foreground hover:text-foreground" title="Regenerate">
                        <RefreshCw className="size-3.5" />
                    </Button>
                    <div className="h-3 w-px bg-border/50 mx-1" />
                    <Button variant="ghost" size="icon-xs" className="text-muted-foreground hover:text-foreground">
                        <ThumbsUp className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon-xs" className="text-muted-foreground hover:text-foreground">
                        <ThumbsDown className="size-3.5" />
                    </Button>
                </div>
            </div>
        </div>
    )
}
