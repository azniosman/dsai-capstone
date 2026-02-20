"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, Square, Loader2, Play } from "lucide-react";
import { services } from "@/lib/services";
import { motion, AnimatePresence } from "framer-motion";

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
      const result = await services.processInterviewTurn(blob, profileId);
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
    <Card className="w-full max-w-lg mx-auto overflow-hidden border-border/50 bg-card/60 backdrop-blur-md shadow-xl rounded-3xl">
      <CardHeader className="border-b border-border/50 bg-background/50 pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="p-2 bg-primary/10 rounded-full text-primary">
            <Mic className="w-5 h-5" />
          </div>
          Live Interview Mock
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col items-center gap-6 pt-8 pb-8 relative">
        <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02] bg-size-[20px_20px] pointer-events-none" />

        {/* Dynamic Visualizer Area */}
        <div className="h-40 w-full flex flex-col items-center justify-center relative z-10">
          <AnimatePresence mode="wait">
            {state === "idle" && (
              <motion.div
                key="idle"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-center"
              >
                <div className="w-20 h-20 mx-auto bg-muted rounded-full flex items-center justify-center mb-4 border border-border">
                  <Mic className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">
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
                className="flex flex-col items-center"
              >
                <motion.div
                  className="w-20 h-20 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-4 shadow-lg shadow-destructive/20 relative"
                  animate={{
                    scale: 1 + (volume / 255) * 0.3,
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 10 }}
                >
                  <div className="absolute inset-0 border-2 border-destructive rounded-full animate-ping opacity-20" />
                  <Mic className="w-8 h-8" />
                </motion.div>
                <p className="text-sm font-semibold text-destructive animate-pulse">
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
                className="flex flex-col items-center"
              >
                <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
                <p className="text-sm font-semibold text-primary">
                  Analyzing answer...
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
                <div className="flex items-center justify-center gap-1.5 mb-6 h-12">
                  {[...Array(9)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="w-2 bg-emerald-500 rounded-full"
                      animate={{
                        height: ["20%", "80%", "40%", "100%", "30%"],
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 1.2,
                        ease: "easeInOut",
                        delay: i * 0.1,
                      }}
                    />
                  ))}
                </div>
                <p className="text-sm font-semibold text-emerald-600 mb-1">
                  Interviewer
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2 text-center max-w-[280px]">
                  "{replyText}"
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="flex gap-4 justify-center relative z-10">
          {state === "idle" && (
            <Button
              size="lg"
              onClick={startRecording}
              className="h-14 px-8 rounded-2xl shadow-md cursor-pointer hover:scale-105 transition-transform"
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
              className="h-14 px-8 rounded-2xl shadow-md cursor-pointer hover:scale-105 transition-transform shadow-destructive/20 animate-pulse"
            >
              <Square className="mr-2 h-5 w-5" />
              Stop Recording
            </Button>
          )}

          {state === "thinking" && (
            <Button size="lg" disabled className="h-14 px-8 rounded-2xl">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Processing...
            </Button>
          )}

          {state === "speaking" && (
            <Button
              size="lg"
              variant="outline"
              onClick={stopSpeaking}
              className="h-14 px-8 rounded-2xl cursor-pointer"
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
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full mt-4 p-4 bg-muted/40 rounded-2xl border border-border/50"
            >
              <p className="text-xs font-semibold text-muted-foreground mb-1">
                You said:
              </p>
              <p className="text-sm italic text-foreground">"{transcript}"</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hidden Audio Element for Playback */}
        <audio ref={audioPlaybackRef} className="hidden" />
      </CardContent>
    </Card>
  );
}
