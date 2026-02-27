"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Mic, MicOff, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VoiceInputProps {
  onAudioReady: (buffer: ArrayBuffer, format: string) => void;
  disabled?: boolean;
  maxDurationMs?: number;
}

const PREFERRED_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/mp4",
];

function getSupportedMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "audio/webm";
  for (const mime of PREFERRED_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return "audio/webm";
}

function mimeToFormat(mime: string): string {
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("mp4")) return "mp3";
  return "webm";
}

export function VoiceInput({
  onAudioReady,
  disabled = false,
  maxDurationMs = 30_000,
}: VoiceInputProps) {
  const [recording, setRecording] = useState(false);
  const [durationMs, setDurationMs] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mimeType = getSupportedMimeType();

  const stopRecording = useCallback(() => {
    if (!recorderRef.current || recorderRef.current.state === "inactive") return;
    recorderRef.current.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoStopRef.current) clearTimeout(autoStopRef.current);
    setRecording(false);
    setDurationMs(0);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const buffer = await blob.arrayBuffer();
        onAudioReady(buffer, mimeToFormat(mimeType));
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start(250); // collect every 250ms
      setRecording(true);

      // Duration counter
      const start = Date.now();
      timerRef.current = setInterval(() => setDurationMs(Date.now() - start), 250);

      // Auto-stop at max duration
      autoStopRef.current = setTimeout(stopRecording, maxDurationMs);
    } catch (err) {
      console.error("Microphone access denied:", err);
    }
  }, [mimeType, maxDurationMs, onAudioReady, stopRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoStopRef.current) clearTimeout(autoStopRef.current);
      recorderRef.current?.stop();
    };
  }, []);

  const seconds = Math.floor(durationMs / 1000);
  const maxSeconds = Math.floor(maxDurationMs / 1000);

  return (
    <div className="flex items-center gap-3">
      {recording ? (
        <>
          <span className="live-dot" aria-hidden />
          <span className="text-sm tabular-nums text-muted-foreground">
            {seconds}s / {maxSeconds}s
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={stopRecording}
            className="gap-2"
          >
            <Square className="h-3 w-3" />
            Stop
          </Button>
        </>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={startRecording}
          disabled={disabled}
          className={cn("gap-2", disabled && "opacity-50 cursor-not-allowed")}
        >
          {disabled ? (
            <MicOff className="h-4 w-4" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
          {disabled ? "Unavailable" : "Record"}
        </Button>
      )}
    </div>
  );
}
