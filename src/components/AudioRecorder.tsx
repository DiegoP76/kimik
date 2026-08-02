"use client";

import { useRef, useState } from "react";
import { Mic, MicOff, Square } from "lucide-react";

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  maxDuration?: number;
}

export function AudioRecorder({ onRecordingComplete, maxDuration = 60 }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [cancelled, setCancelled] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (!cancelled) {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          onRecordingComplete(blob);
        }
        setCancelled(false);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((prev) => {
          if (prev >= maxDuration) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch {
      alert("No se pudo acceder al microfono");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const cancelRecording = () => {
    setCancelled(true);
    stopRecording();
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {!isRecording ? (
        <button
          type="button"
          onClick={startRecording}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full text-sm text-gray-700 hover:bg-gray-200 transition-colors"
        >
          <Mic className="w-4 h-4" />
          Grabar nota de voz
        </button>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm font-mono text-red-600">{formatDuration(duration)}</span>
            <span className="text-xs text-gray-500">/ {formatDuration(maxDuration)}</span>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={cancelRecording}
              className="flex items-center gap-1 px-3 py-2 bg-gray-100 rounded-full text-sm text-gray-600"
            >
              <MicOff className="w-4 h-4" />
              Cancelar
            </button>
            <button
              type="button"
              onClick={stopRecording}
              className="flex items-center gap-1 px-3 py-2 bg-red-600 rounded-full text-sm text-white"
            >
              <Square className="w-4 h-4" />
              Detener
            </button>
          </div>
        </>
      )}
    </div>
  );
}
