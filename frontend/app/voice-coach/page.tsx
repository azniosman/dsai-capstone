"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Volume2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { VoiceInput } from "@/components/voice-input";
import { VoiceWebSocketClient, type VoiceMessage } from "@/lib/websocket";

const WS_URL = process.env.NEXT_PUBLIC_VOICE_WS_URL ?? "";

interface Turn {
  role: "user" | "assistant";
  text: string;
  audioB64?: string;
  audioFormat?: string;
}

export default function VoiceCoachPage() {
  const [status, setStatus] = useState<"connected" | "disconnected" | "error">("disconnected");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [processing, setProcessing] = useState(false);
  const clientRef = useRef<VoiceWebSocketClient | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const profileId = typeof window !== "undefined"
    ? parseInt(localStorage.getItem("profileId") ?? "0", 10) || 0
    : 0;

  // Connect WebSocket
  useEffect(() => {
    if (!WS_URL) return;
    const client = new VoiceWebSocketClient(WS_URL);
    clientRef.current = client;

    client.onStatusChange = setStatus;
    client.onMessage = (msg: VoiceMessage) => {
      if (msg.type === "audio_response") {
        setTurns((prev) => [
          ...prev,
          { role: "user", text: msg.transcript },
          { role: "assistant", text: msg.response_text, audioB64: msg.audio_base64, audioFormat: msg.audio_format },
        ]);
        // Auto-play audio response
        if (msg.audio_base64 && audioRef.current) {
          const src = `data:audio/${msg.audio_format};base64,${msg.audio_base64}`;
          audioRef.current.src = src;
          audioRef.current.play().catch(() => null);
        }
        setProcessing(false);
      } else if (msg.type === "error") {
        setTurns((prev) => [...prev, { role: "assistant", text: `Error: ${msg.message}` }]);
        setProcessing(false);
      }
    };

    client.connect();
    return () => client.disconnect();
  }, []);

  // Scroll to bottom on new turns
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns]);

  const handleAudioReady = useCallback(
    (buffer: ArrayBuffer, format: string) => {
      if (!clientRef.current?.isConnected || !profileId) return;
      try {
        setProcessing(true);
        clientRef.current.sendAudio(buffer, profileId, format);
      } catch (err) {
        console.error("Send audio error:", err);
        setProcessing(false);
      }
    },
    [profileId],
  );

  const statusColor: Record<typeof status, "success" | "destructive" | "warning"> = {
    connected: "success",
    disconnected: "outline" as never,
    error: "destructive",
  };

  if (!WS_URL) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          section="Tools"
          title="Voice Coach"
          description="Real-time AI career coaching via voice"
        />
        <Card variant="elevated" className="p-8 text-center">
          <p className="text-muted-foreground text-sm">
            Voice Coach requires <code className="font-mono">NEXT_PUBLIC_VOICE_WS_URL</code> to be configured.
            Deploy the WebSocket API Gateway and set the environment variable.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 h-full">
      <PageHeader
        section="Tools"
        title="Voice Coach"
        description="Speak to your AI career coach and hear personalised guidance"
        action={
          <Badge variant={statusColor[status] as never} className="capitalize">
            {status}
          </Badge>
        }
      />

      {/* Conversation */}
      <Card variant="elevated" className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {turns.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-12">
              Press <strong>Record</strong> and ask anything about your career journey.
            </p>
          )}
          {turns.map((turn, i) => (
            <div
              key={i}
              className={`flex gap-3 ${turn.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {turn.role === "assistant" && (
                <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                  <Volume2 className="h-4 w-4 text-primary" />
                </div>
              )}
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  turn.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                {turn.text}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-border p-4 flex items-center gap-4">
          <audio ref={audioRef} className="hidden" />
          <VoiceInput
            onAudioReady={handleAudioReady}
            disabled={!clientRef.current?.isConnected || processing || !profileId}
          />
          {processing && (
            <span className="text-xs text-muted-foreground flex items-center gap-2">
              <span className="animate-typing-dot inline-block h-1.5 w-1.5 rounded-full bg-primary" />
              <span className="animate-typing-dot inline-block h-1.5 w-1.5 rounded-full bg-primary [animation-delay:0.2s]" />
              <span className="animate-typing-dot inline-block h-1.5 w-1.5 rounded-full bg-primary [animation-delay:0.4s]" />
              Processing…
            </span>
          )}
          {!profileId && (
            <span className="text-xs text-muted-foreground">
              Create a profile first to use Voice Coach.
            </span>
          )}
        </div>
      </Card>
    </div>
  );
}
