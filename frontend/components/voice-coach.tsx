"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, Volume2, Square } from "lucide-react";
import { services } from "@/lib/services";

interface VoiceCoachProps {
  textToRead?: string;
  onTranscription?: (text: string) => void;
}

export function VoiceCoach({ textToRead, onTranscription }: VoiceCoachProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleSpeak = async () => {
    if (!textToRead) return;

    try {
      setIsPlaying(true);
      // Call backend to get MP3 blob
      const audioBlob = await services.textToSpeech(textToRead);
      const url = URL.createObjectURL(audioBlob);

      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
        audioRef.current.onended = () => setIsPlaying(false);
      }
    } catch (err) {
      console.error("TTS failed", err);
      setIsPlaying(false);
    }
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
  };

  return (
    <Card className="w-full max-w-md mx-auto mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="w-5 h-5" />
          Voice Coach (Beta)
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex gap-2 justify-center">
          {!isPlaying ? (
            <Button onClick={handleSpeak} disabled={!textToRead}>
              <Volume2 className="mr-2 h-4 w-4" />
              Read Advice
            </Button>
          ) : (
            <Button variant="destructive" onClick={handleStop}>
              <Square className="mr-2 h-4 w-4" />
              Stop
            </Button>
          )}
        </div>

        {/* Hidden Audio Element */}
        <audio ref={audioRef} className="hidden" />

        <p className="text-xs text-muted-foreground text-center">
          Real-time voice interaction coming soon.
        </p>
      </CardContent>
    </Card>
  );
}
