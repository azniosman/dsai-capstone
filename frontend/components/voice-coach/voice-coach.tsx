"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, Square, Loader2 } from "lucide-react";
import api from "@/lib/api-client";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface VoiceCoachProps {
  profileId?: number;
}

type VoiceState = "idle" | "listening" | "thinking" | "speaking";

export function VoiceCoach({ profileId }: VoiceCoachProps) {
  const [state, setState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState<string>("");
  const [replyText, setReplyText] = useState<string>("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>(null);
  const [volume, setVolume] = useState(0);

  const audioPlaybackRef = useRef<HTMLAudioElement | null>(null);

  // Clean up recording/animation on unmount
  useEffect(() => {
    return () => {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state === "recording"
      ) {
        mediaRecorderRef.current.stop();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const monitorVolume = () => {
    if (!analyzerRef.current) return;
    const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
    analyzerRef.current.getByteFrequencyData(dataArray);

    // Calculate average volume
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const avg = sum / dataArray.length;
    setVolume(avg);

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    animationFrameRef.current = requestAnimationFrame(monitorVolume);
  };

  const startRecording = async () => {
    try {
      setTranscript("");
      setReplyText("");
      if (audioPlaybackRef.current) {
        audioPlaybackRef.current.pause();
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Setup audio analyzer for visualizer
      audioContextRef.current = new window.AudioContext();
      analyzerRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyzerRef.current);
      analyzerRef.current.fftSize = 256;
      monitorVolume();

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks to release mic
        stream.getTracks().forEach((track) => track.stop());
        if (animationFrameRef.current)
          cancelAnimationFrame(animationFrameRef.current);
        setVolume(0);

        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        await processAudio(audioBlob);
      };

      mediaRecorder.start(100); // collect 100ms chunks
      setState("listening");
    } catch (err) {
      console.error("Failed to start recording:", err);
      setState("idle");
    }
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
      setState("thinking");
    }
  };

  const processAudio = async (blob: Blob) => {
    try {
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");
      if (profileId) formData.append("profile_id", profileId.toString());
      const { data: result } = await api.post<{
        transcript: string;
        reply_text: string;
        audio_base64?: string;
      }>("/api/voice/interview_turn", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setTranscript(result.transcript);
      setReplyText(result.reply_text);

      if (result.audio_base64) {
        const audioUrl = `data:audio/mp3;base64,${result.audio_base64}`;
        if (audioPlaybackRef.current) {
          audioPlaybackRef.current.src = audioUrl;
          audioPlaybackRef.current.onended = () => setState("idle");
          audioPlaybackRef.current.play();
          setState("speaking");
        } else {
          setState("idle");
        }
      } else {
        setState("idle");
      }
    } catch (err) {
      console.error("Interview turn failed:", err);
      setState("idle");
    }
  };

  const stopSpeaking = () => {
    if (audioPlaybackRef.current) {
      audioPlaybackRef.current.pause();
      audioPlaybackRef.current.currentTime = 0;
    }
    setState("idle");
  };

  return (
    <Card className="w-full max-w-lg mx-auto overflow-hidden border-border/40 bg-card/40 backdrop-blur-2xl shadow-2xl rounded-[2rem] relative group">
      {/* Subtle background glow */}
      <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-primary/5 opacity-50 pointer-events-none -z-10" />

      <CardHeader className="border-b border-border/40 bg-background/30 pb-5 backdrop-blur-md relative z-10">
        <CardTitle className="flex items-center justify-between text-lg tracking-tight">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-2xl text-primary ring-1 ring-primary/20 shadow-[0_0_15px_rgba(var(--primary),0.1)]">
              <Mic className="w-5 h-5" />
            </div>
            <span className="font-bold">Live Interview Mock</span>
          </div>
          {/* Status Indicator */}
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              {(state === "listening" || state === "speaking") && (
                <span
                  className={cn(
                    "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                    state === "listening" ? "bg-destructive" : "bg-emerald-400",
                  )}
                />
              )}
              <span
                className={cn(
                  "relative inline-flex rounded-full h-2 w-2 transition-colors duration-300",
                  state === "listening"
                    ? "bg-destructive"
                    : state === "speaking"
                      ? "bg-emerald-500"
                      : "bg-muted-foreground/50",
                )}
              />
            </span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
              {state}
            </span>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col items-center gap-8 pt-10 pb-10 relative z-10">
        {/* Dynamic Visualizer Area */}
        <div className="h-48 w-full flex flex-col items-center justify-center relative">
          <AnimatePresence mode="wait">
            {state === "idle" && (
              <motion.div
                key="idle"
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                transition={{ duration: 0.3 }}
                className="text-center flex flex-col items-center group cursor-pointer"
                onClick={startRecording}
              >
                <div className="relative w-28 h-28 flex items-center justify-center mb-6">
                  <div className="absolute inset-0 bg-primary/5 rounded-full blur-xl group-hover:bg-primary/10 transition-colors duration-500" />
                  <div className="w-24 h-24 bg-card border border-border/50 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-primary/20 group-hover:scale-105 transition-all duration-300 relative z-10">
                    <Mic className="w-10 h-10 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
                <p className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                  Tap microphone to begin
                </p>
              </motion.div>
            )}

            {state === "listening" && (
              <motion.div
                key="listening"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center justify-center h-full w-full"
              >
                <div className="relative flex items-center justify-center w-32 h-32 mb-4">
                  {/* Dynamic volume rings */}
                  <motion.div
                    className="absolute inset-0 bg-destructive/10 rounded-full border border-destructive/20"
                    animate={{
                      scale: 1 + (volume / 255) * 1.5,
                      opacity: 1 - (volume / 255) * 0.5,
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  />
                  <motion.div
                    className="absolute inset-4 bg-destructive/20 rounded-full"
                    animate={{
                      scale: 1 + (volume / 255) * 0.8,
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  />
                  <div className="relative z-10 w-20 h-20 bg-destructive/90 text-destructive-foreground rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.4)]">
                    <Mic className="w-8 h-8 animate-pulse" />
                  </div>
                </div>
                <p className="text-sm font-bold tracking-widest text-destructive uppercase animate-pulse">
                  Listening...
                </p>
              </motion.div>
            )}

            {state === "thinking" && (
              <motion.div
                key="thinking"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center justify-center h-full w-full"
              >
                <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
                  {/* Rotating gradient border */}
                  <motion.div
                    className="absolute inset-0 rounded-full bg-linear-to-tr from-primary via-primary/20 to-transparent opacity-80"
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  />
                  <div className="absolute inset-1 bg-card rounded-full flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  </div>
                </div>
                <p className="text-sm font-semibold text-primary/80">
                  Formulating response...
                </p>
              </motion.div>
            )}

            {state === "speaking" && (
              <motion.div
                key="speaking"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center w-full px-6"
              >
                <div className="flex items-center justify-center gap-1.5 mb-8 h-16 w-full max-w-[200px]">
                  {/* Premium Waveform - Precalculated random scales for purity */}
                  {[
                    [0.6, 0.4],
                    [0.8, 0.6],
                    [0.5, 0.7],
                    [0.9, 0.5],
                    [0.6, 0.8],
                    [0.7, 0.4],
                    [0.95, 0.6],
                    [0.8, 0.9],
                    [0.5, 0.7],
                    [0.8, 0.5],
                    [0.4, 0.8],
                    [0.9, 0.6],
                    [0.7, 0.5],
                    [0.85, 0.7],
                    [0.6, 0.9],
                  ].map(([r1, r2], i) => (
                    <motion.div
                      key={i}
                      className="w-2.5 rounded-full bg-linear-to-t from-emerald-600 to-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                      animate={{
                        height: [
                          "20%",
                          `${r1 * 60 + 40}%`,
                          "30%",
                          `${r2 * 50 + 50}%`,
                          "20%",
                        ],
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 1.5 + (i % 3) * 0.2,
                        ease: "easeInOut",
                        delay: i * 0.05,
                      }}
                    />
                  ))}
                </div>
                <div className="w-full max-w-sm p-4 rounded-2xl bg-muted/40 border border-border/50 backdrop-blur-sm relative">
                  <div className="absolute -top-3 left-6 px-2 bg-background text-[10px] font-bold text-emerald-500 uppercase tracking-widest border border-border/50 rounded-full">
                    Interviewer
                  </div>
                  <p className="text-sm text-foreground/90 font-medium leading-relaxed text-center line-clamp-3">
                    &quot;{replyText}&quot;
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="flex gap-4 justify-center relative z-10 w-full px-6">
          {state === "idle" && (
            <Button
              size="lg"
              onClick={startRecording}
              className="w-full h-14 rounded-2xl shadow-lg shadow-primary/20 cursor-pointer hover:scale-[1.02] transition-all bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              <Mic className="mr-2 h-5 w-5" />
              Start Recording
            </Button>
          )}

          {state === "listening" && (
            <Button
              size="lg"
              variant="destructive"
              onClick={stopRecording}
              className="w-full h-14 rounded-2xl shadow-lg shadow-destructive/20 cursor-pointer hover:scale-[1.02] transition-all font-semibold overflow-hidden relative group"
            >
              <div className="absolute inset-0 bg-white/10 group-hover:bg-transparent transition-colors" />
              <Square className="mr-2 h-5 w-5 relative z-10" />
              <span className="relative z-10">Stop Recording</span>
            </Button>
          )}

          {state === "thinking" && (
            <Button
              size="lg"
              disabled
              className="w-full h-14 rounded-2xl font-semibold opacity-80 border-border/50"
            >
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Processing Audio...
            </Button>
          )}

          {state === "speaking" && (
            <Button
              size="lg"
              variant="outline"
              onClick={stopSpeaking}
              className="w-full h-14 rounded-2xl cursor-pointer hover:bg-muted/50 border-border/60 shadow-sm font-semibold"
            >
              <Square className="mr-2 h-5 w-5 text-muted-foreground" />
              Stop Speaking
            </Button>
          )}
        </div>

        {/* Transcription Display */}
        <AnimatePresence>
          {transcript && state !== "listening" && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="w-full mt-2 px-6"
            >
              <div className="w-full p-5 bg-card/80 backdrop-blur-md rounded-2xl border border-border/60 shadow-inner">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-primary/70" />
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    Your Transcript
                  </p>
                </div>
                <p className="text-sm italic text-foreground/80 leading-relaxed font-medium">
                  &quot;{transcript}&quot;
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hidden Audio Element for Playback */}
        <audio ref={audioPlaybackRef} className="hidden" />
      </CardContent>
    </Card>
  );
}
