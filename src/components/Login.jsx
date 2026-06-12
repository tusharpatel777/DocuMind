import React, { useState } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { Brain, Shield, Sparkles, FileText, Lock, ArrowRight } from "lucide-react";

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
      setError("Sign-In attempt was cancelled or failed. Please check your credentials.");
    },
  });

  return (
    <div className="h-[100dvh] w-screen bg-[#060a12] text-slate-150 flex flex-col justify-between relative font-sans overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-[700px] h-[700px] bg-emerald-500/5 rounded-full blur-[150px] pointer-events-none pulse-glow-emerald"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-teal-500/5 rounded-full blur-[130px] pointer-events-none"></div>

      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0c1626_1px,transparent_1px),linear-gradient(to_bottom,#0c1626_1px,transparent_1px)] bg-[size:5rem_5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-25"></div>

      <div className="absolute top-[20%] left-[15%] text-slate-800 opacity-20 animate-bounce pointer-events-none" style={{ animationDuration: '6s' }}>
        <FileText className="w-12 h-12" />
      </div>
      <div className="absolute bottom-[25%] left-[20%] text-slate-800 opacity-20 animate-pulse pointer-events-none" style={{ animationDuration: '4s' }}>
        <Shield className="w-10 h-10" />
      </div>
      <div className="absolute top-[30%] right-[15%] text-slate-800 opacity-20 animate-pulse pointer-events-none" style={{ animationDuration: '5s' }}>
        <Lock className="w-10 h-10" />
      </div>
      <div className="absolute bottom-[20%] right-[20%] text-slate-800 opacity-20 animate-bounce pointer-events-none" style={{ animationDuration: '7s' }}>
        <Sparkles className="w-12 h-12" />
      </div>

      {/* Header / Nav */}
      <header className="relative z-20 w-full px-4 sm:px-8 py-4 sm:py-6 flex items-center justify-between bg-slate-950/10 backdrop-blur-md border-b border-slate-900/55">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-tr from-emerald-500 to-teal-500 rounded-xl shadow-lg border border-emerald-400/20">
            <Brain className="w-5 h-5 text-slate-950 font-bold" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white flex items-center">
            DocuMind <span className="text-emerald-400 ml-1.5 text-[10px] font-semibold px-2 py-0.5 bg-emerald-950/40 rounded-full border border-emerald-500/20">AI</span>
          </span>
        </div>
        <div className="hidden sm:flex items-center space-x-2 bg-slate-900/40 px-3.5 py-1.5 rounded-full border border-slate-850 text-xs text-slate-400">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
          <span>HuggingFace Space Active</span>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 max-w-4xl mx-auto w-full">
        <div className="inline-flex items-center space-x-2 bg-slate-950/50 px-4 py-1.5 rounded-full border border-slate-850 text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-6">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
          <span>SYSTEM OPERATIONAL • V2.5 AI LIVE</span>
        </div>

        <h1 className="text-4xl sm:text-7xl font-extrabold tracking-tight text-white leading-none">
          Analyze. <br className="sm:hidden" />
          <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
            Understand.
          </span>
        </h1>

        <p className="text-sm sm:text-base text-slate-450 mt-6 max-w-lg leading-relaxed">
          The next-generation document intelligence platform. Chat, summarize, and cross-examine your files using hybrid search and citation-grounded RAG.
        </p>

        {error && (
          <div className="w-full max-w-md mt-6 p-3.5 bg-red-950/30 border border-red-500/30 rounded-2xl text-red-400 text-xs text-center">
            {error}
          </div>
        )}

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md">
          <button
            onClick={() => login()}
            disabled={isLoading}
            className="w-full sm:w-auto px-8 py-4 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-450 hover:text-emerald-300 border border-emerald-550/25 hover:border-emerald-400/50 rounded-2xl font-bold text-sm flex items-center justify-center space-x-3.5 transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.05)] hover:shadow-[0_0_20px_rgba(16,185,129,0.18)] active:scale-[0.97] cursor-pointer relative overflow-hidden group backdrop-blur-md"
          >
            {/* Shimmer light effect */}
            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-emerald-400/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
            
            <svg className="w-5 h-5 fill-current text-emerald-450 group-hover:text-emerald-300 transition-colors" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span className="tracking-wide">
              {isLoading ? "Connecting Account..." : "Launch with Google"}
            </span>
          </button>

          <button
            onClick={() => login()}
            className="w-full sm:w-auto px-8 py-4 bg-slate-950/20 hover:bg-slate-950/45 text-slate-400 hover:text-white rounded-2xl font-bold text-sm border border-slate-900 hover:border-slate-800 transition-all duration-300 active:scale-[0.97] cursor-pointer flex items-center justify-center space-x-2 backdrop-blur-md"
          >
            <span>Learn More</span>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
          </button>
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="relative z-10 w-full py-4 sm:py-8 text-center text-[10px] tracking-[0.2em] text-slate-650 uppercase font-semibold border-t border-slate-950/60">
        <div className="flex items-center justify-center space-x-4">
          <span>Secure</span>
          <span className="w-1 h-1 bg-slate-800 rounded-full"></span>
          <span>Fast</span>
          <span className="w-1 h-1 bg-slate-800 rounded-full"></span>
          <span>Intelligent</span>
        </div>
      </footer>
    </div>
  );
}
