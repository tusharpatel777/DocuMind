import React, { useState } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { Mic, CheckCircle, Sparkles, ArrowRight, ShieldCheck, Lock } from "lucide-react";

export default function Login({ onLoginSuccess }) {
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsLoading(true);
      setError("");
      try {
        const res = await fetch(
          `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${tokenResponse.access_token}`
        );
        if (!res.ok) {
          throw new Error("Failed to fetch user info from Google");
        }
        const profile = await res.json();
        
        if (profile && profile.email) {
          onLoginSuccess({
            email: profile.email,
            name: profile.name || "Google User",
            picture: profile.picture || "",
            googleId: profile.sub,
            token: tokenResponse.access_token,
          });
        } else {
          throw new Error("Invalid profile payload");
        }
      } catch (err) {
        console.error("Google profile fetch failed:", err);
        setError("Failed to sync your Google profile details. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    onError: (err) => {
      console.error("Google OAuth Login Failed:", err);
      setError("Sign-In attempt was cancelled or failed. Please try again.");
    },
  });

  return (
    <div className="h-[100dvh] w-screen bg-[#06090e] text-slate-100 flex items-center justify-center p-6 relative font-sans overflow-hidden bg-radial-glow">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[150px] pointer-events-none pulse-glow-emerald" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-emerald-950/25 rounded-full blur-[130px] pointer-events-none" />

      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none" />

      {/* Main 2-Column Container (InterviewOS Reference Layout) */}
      <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        {/* Left Hero Column */}
        <div className="lg:col-span-7 space-y-6 text-left">
          {/* Logo Badge */}
          <div className="inline-flex items-center space-x-2.5 px-3 py-1.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 glow-emerald-sm">
            <Mic className="w-4 h-4 fill-emerald-400/20" />
            <span className="text-sm font-bold text-white tracking-tight">DocuMind <span className="text-emerald-400 font-normal italic font-serif-accent text-base">AI 2.0</span></span>
          </div>

          {/* Headline with Serif Italic Accent */}
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
            Research like it's your <br />
            <span className="text-emerald-400 font-serif-accent italic font-normal text-5xl sm:text-7xl">
              dream company's
            </span>{" "}
            interview.
          </h1>

          {/* Feature Bullet Points with Emerald Checks */}
          <div className="space-y-3 pt-2 text-sm text-slate-300">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>Real Voice Speech & Studio Whisper STT</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>Gemini 3.6 Flash & Groq Llama 3.3 Multi-Model</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>Small-to-Big Parent Context Retrieval</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>Mathematically citation-grounded answers</span>
            </div>
          </div>
        </div>

        {/* Right Sign-in Card Column (Reference Card Style) */}
        <div className="lg:col-span-5">
          <div className="bg-[#0b1019]/90 bg-grid-pattern border border-white/10 rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden backdrop-blur-xl glow-emerald-card">
            {/* Glow ambient */}
            <div className="absolute top-0 right-0 w-48 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

            <h2 className="text-2xl font-bold text-white mb-2">
              Sign in to start
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed mb-8">
              Your research documents, verified citations, and conversation history are automatically saved to your workspace.
            </p>

            {error && (
              <div className="mb-6 p-3 bg-rose-950/40 border border-rose-500/30 rounded-xl text-rose-400 text-xs text-left">
                {error}
              </div>
            )}

            {/* Google Sign-in Pill Button (Reference Image 2 Style) */}
            <button
              onClick={() => login()}
              disabled={isLoading}
              className="w-full p-3.5 bg-slate-900 hover:bg-slate-850 text-white rounded-2xl border border-white/15 hover:border-emerald-500/50 flex items-center justify-between transition-all duration-200 shadow-lg group cursor-pointer active:scale-98"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold text-white">
                  G
                </div>
                <div className="text-left">
                  <span className="text-xs font-semibold text-white block">
                    {isLoading ? "Connecting Account..." : "Continue with Google"}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    Secure workspace authentication
                  </span>
                </div>
              </div>

              {/* Google Brand SVG */}
              <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-sm">
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.7 1 4 3.5 2.2 7.1l3.7 2.8C6.8 6.9 9.2 5 12 5z" />
                  <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
                  <path fill="#FBBC05" d="M5.9 14.1c-.2-.7-.4-1.4-.4-2.1s.2-1.4.4-2.1L2.2 7.1C1.4 8.6 1 10.2 1 12s.4 3.4 1.2 4.9l3.7-2.8z" />
                  <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-2.8 0-5.2-1.9-6.1-4.5L2.2 16.6C4 20.2 7.7 23 12 23z" />
                </svg>
              </div>
            </button>

            <p className="text-[10px] text-slate-500 text-center mt-6 leading-relaxed">
              By continuing, you agree to access citation-grounded RAG intelligence powered by Google Gemini 3.6 Flash & Groq Llama 3.3.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
