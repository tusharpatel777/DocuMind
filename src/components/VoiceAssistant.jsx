import React, { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Volume2, Square, Loader2, Sparkles, X, Check, ArrowRight } from "lucide-react";
import { transcribeAudio } from "../services/api";

export default function VoiceAssistant({ isOpen, onClose, onTranscriptComplete }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [recordingTime, setRecordingTime] = useState(0);
  const [mode, setMode] = useState("whisper"); // 'whisper' | 'webspeech'
  const [audioLevel, setAudioLevel] = useState(0);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const recognitionRef = useRef(null);
  const animationFrameRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);

  // Clean up on unmount or close
  useEffect(() => {
    return () => {
      stopAllRecording();
    };
  }, []);

  const stopAllRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {}
    }
  };

  const startRecording = async () => {
    setTranscript("");
    setRecordingTime(0);
    audioChunksRef.current = [];

    // Check if Web Speech is available
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (mode === "webspeech" && SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onresult = (event) => {
          let current = "";
          for (let i = 0; i < event.results.length; i++) {
            current += event.results[i][0].transcript;
          }
          setTranscript(current);
        };

        recognition.onerror = (e) => {
          console.warn("Speech recognition error:", e);
        };

        recognition.start();
        recognitionRef.current = recognition;
        setIsRecording(true);

        timerRef.current = setInterval(() => {
          setRecordingTime((prev) => prev + 1);
        }, 1000);
        return;
      } catch (e) {
        console.warn("Web Speech API failed, falling back to Whisper:", e);
      }
    }

    // Default: MediaRecorder + Whisper Large v3
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Audio level analyser for waveform
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 64;
      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const updateLevel = () => {
        if (!analyserRef.current) return;
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((p, c) => p + c, 0) / dataArray.length;
        setAudioLevel(avg / 128); // 0.0 to 2.0
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop stream tracks
        stream.getTracks().forEach((track) => track.stop());
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (audioBlob.size > 1000) {
          setIsProcessing(true);
          try {
            const result = await transcribeAudio(audioBlob);
            if (result && result.text) {
              setTranscript(result.text);
            }
          } catch (err) {
            console.error("Transcription failed:", err);
            setTranscript("Sorry, transcription encountered an error. Please try again.");
          } finally {
            setIsProcessing(false);
          }
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Microphone access denied:", err);
      alert("Microphone permission is required to use the voice assistant.");
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
  };

  const handleApply = () => {
    if (transcript.trim()) {
      onTranscriptComplete(transcript.trim());
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-800/80 rounded-2xl shadow-2xl p-6 overflow-hidden">
        {/* Glow ambient */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Voice Assistant</h3>
              <p className="text-xs text-slate-400">Whisper Large v3 Studio Transcription</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopAllRecording();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Central Audio Waveform & Status */}
        <div className="my-8 flex flex-col items-center justify-center">
          {/* Animated visualizer circle */}
          <div className="relative flex items-center justify-center">
            {isRecording && (
              <div
                className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping"
                style={{ transform: `scale(${1 + audioLevel * 0.8})` }}
              />
            )}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
              className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl ${
                isRecording
                  ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/50 scale-105"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/50 hover:scale-105"
              }`}
            >
              {isProcessing ? (
                <Loader2 className="w-10 h-10 animate-spin" />
              ) : isRecording ? (
                <Square className="w-8 h-8 fill-current" />
              ) : (
                <Mic className="w-10 h-10" />
              )}
            </button>
          </div>

          {/* Timer & State */}
          <div className="mt-4 text-center">
            {isRecording ? (
              <div className="flex items-center space-x-2 text-rose-400 font-medium text-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                <span>Recording... {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, "0")}</span>
              </div>
            ) : isProcessing ? (
              <div className="text-indigo-400 font-medium text-sm flex items-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Transcribing via Whisper Large v3...</span>
              </div>
            ) : (
              <p className="text-slate-400 text-sm">Click the microphone to speak your question</p>
            )}
          </div>

          {/* Sound Wave Bars */}
          {isRecording && (
            <div className="flex items-center space-x-1.5 mt-4 h-8">
              {[40, 70, 90, 60, 100, 80, 50, 90, 75, 45].map((h, i) => (
                <div
                  key={i}
                  className="w-1 bg-indigo-400 rounded-full transition-all duration-100"
                  style={{
                    height: `${Math.max(6, Math.min(32, (h * audioLevel) / 2))}px`,
                    opacity: 0.4 + (audioLevel * 0.6)
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Transcript Box */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Recognized Text:
          </label>
          <div className="w-full min-h-[90px] max-h-[140px] overflow-y-auto p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-600 focus:outline-none">
            {transcript || (
              <span className="text-slate-500 italic">Your spoken query will appear here...</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-end space-x-3">
          <button
            onClick={() => {
              stopAllRecording();
              onClose();
            }}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={!transcript.trim() || isRecording || isProcessing}
            className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-lg shadow-indigo-600/30 flex items-center space-x-1.5"
          >
            <span>Use Prompt</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
