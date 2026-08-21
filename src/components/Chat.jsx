import React, { useState, useRef, useEffect, useCallback } from "react";
import { 
  Send, 
  Sparkles, 
  AlertCircle, 
  Mic, 
  MicOff,
  Download, 
  Settings2,
  Trash2,
  CheckCircle,
  ArrowRight
} from "lucide-react";
import RagInspector from "./RagInspector";
import VoiceAssistant from "./VoiceAssistant";
import MessageCard from "./MessageCard";

export default function Chat({
  messages,
  onSendMessage,
  onDeleteCurrentSession,
  isStreaming,
  currentStreamedAnswer,
  selectedDocIds,
  activeCitation,
  setActiveCitation,
  useHyde,
  setUseHyde,
  rerank,
  setRerank,
  useHybrid,
  setUseHybrid,
  useParentChild,
  setUseParentChild,
  selectedProvider,
  setSelectedProvider,
  selectedModel,
  setSelectedModel,
  currentInspectorData
}) {
  const [input, setInput] = useState("");
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [isLiveListening, setIsLiveListening] = useState(false);
  const [inspectorModalData, setInspectorModalData] = useState(null);
  const [isSpeakingIndex, setIsSpeakingIndex] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [showConfig, setShowConfig] = useState(false);

  const messagesEndRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis || null);
  const recognitionRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, currentStreamedAnswer]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  // Direct In-Line Live Speech Recognition (Web Speech API)
  const toggleLiveSpeech = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceModalOpen(true);
      return;
    }

    if (isLiveListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsLiveListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      let initialPrompt = input;

      recognition.onstart = () => {
        setIsLiveListening(true);
      };

      recognition.onresult = (event) => {
        let transcriptChunk = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcriptChunk += event.results[i][0].transcript;
        }
        if (transcriptChunk) {
          setInput((prev) => {
            const base = initialPrompt.trim() ? initialPrompt.trim() + " " : "";
            return base + transcriptChunk.trim();
          });
        }
      };

      recognition.onerror = (e) => {
        console.warn("Speech Recognition Error:", e);
        setIsLiveListening(false);
      };

      recognition.onend = () => {
        setIsLiveListening(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      console.warn("Direct Speech Recognition failed:", err);
      setVoiceModalOpen(true);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isStreaming || selectedDocIds.length === 0) return;
    if (isLiveListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsLiveListening(false);
    }
    onSendMessage(input.trim());
    setInput("");
  };

  const handleVoiceTranscript = useCallback((text) => {
    setInput(text);
  }, []);

  const handleInspect = useCallback((inspectorData) => {
    setInspectorModalData(inspectorData);
  }, []);

  const handleReadAloud = useCallback((text, index) => {
    if (!synthRef.current) return;

    if (isSpeakingIndex === index) {
      synthRef.current.cancel();
      setIsSpeakingIndex(null);
      return;
    }

    synthRef.current.cancel();
    const cleanText = text
      .replace(/\[SOURCE:\s*[a-zA-Z0-9_-]+\s*\]/gi, "")
      .replace(/[#*`_]/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => setIsSpeakingIndex(null);
    utterance.onerror = () => setIsSpeakingIndex(null);

    setIsSpeakingIndex(index);
    synthRef.current.speak(utterance);
  }, [isSpeakingIndex]);

  const handleCopyMessage = useCallback((text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  }, []);

  const handleCitationClick = useCallback((citation) => {
    setActiveCitation(citation);
  }, [setActiveCitation]);

  const handleExportChat = () => {
    if (messages.length === 0) return;
    let mdContent = `# DocuMind AI Conversation Export\n\nDate: ${new Date().toLocaleString()}\n\n---\n\n`;
    messages.forEach((m) => {
      const isUser = m.type === "user" || m.role === "user";
      if (isUser) {
        mdContent += `### 👤 User:\n${m.content}\n\n`;
      } else {
        mdContent += `### 🤖 DocuMind AI (${m.provider || "groq"}):\n${m.content}\n\n`;
      }
    });

    const blob = new Blob([mdContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `documind-chat-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const quickPrompts = [
    "Summarize the core objectives and findings in detail.",
    "Extract key metrics, financial figures, and data tables.",
    "What are the primary risk factors or limitations mentioned?",
    "Compare the different methodologies discussed in the document."
  ];

  return (
    <div className="flex flex-col h-full bg-[#06090e] relative overflow-hidden">
      {/* Top Model Switcher & Toolbar */}
      <div className="px-5 py-3 border-b border-white/[0.08] bg-[#070c14]/90 backdrop-blur-md flex items-center justify-between z-10 flex-wrap gap-2">
        <div className="flex items-center space-x-3">
          {/* Provider / Model Switcher */}
          <div className="flex items-center space-x-1 bg-slate-950/80 border border-white/[0.08] rounded-xl p-1">
            <button
              onClick={() => {
                setSelectedProvider("groq");
                setSelectedModel("llama-3.3-70b-versatile");
              }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                selectedProvider === "groq"
                  ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Groq Llama 3.3
            </button>
            <button
              onClick={() => {
                setSelectedProvider("gemini");
                setSelectedModel("gemini-3.6-flash");
              }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1 ${
                selectedProvider === "gemini"
                  ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Sparkles className="w-3 h-3 text-emerald-950" />
              <span>Gemini 3.6 Flash</span>
            </button>
          </div>

          {/* Feature Badges */}
          <div className="hidden lg:flex items-center space-x-2 text-[11px] font-mono pl-2">
            <span className={`px-2 py-0.5 rounded border ${useParentChild ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-slate-900 text-slate-500 border-white/5"}`}>
              Small-to-Big ✓
            </span>
            <span className={`px-2 py-0.5 rounded border ${useHybrid ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-slate-900 text-slate-500 border-white/5"}`}>
              Hybrid RRF
            </span>
            <span className={`px-2 py-0.5 rounded border ${rerank ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-slate-900 text-slate-500 border-white/5"}`}>
              MiniLM Rerank
            </span>
          </div>
        </div>

        {/* Right Tools: Config Drawer, Delete Session, Export */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className={`p-2 rounded-xl border transition-colors ${
              showConfig ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" : "bg-slate-900/80 border-white/[0.08] text-slate-400 hover:text-white"
            }`}
            title="Configure RAG Parameters"
          >
            <Settings2 className="w-4 h-4" />
          </button>

          {messages.length > 0 && (
            <>
              <button
                onClick={onDeleteCurrentSession}
                className="p-2 bg-slate-900/80 border border-white/[0.08] hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 rounded-xl transition-colors"
                title="Delete this conversation"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                onClick={handleExportChat}
                className="p-2 bg-slate-900/80 border border-white/[0.08] hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"
                title="Export Conversation as Markdown"
              >
                <Download className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Expandable Configuration Drawer */}
      {showConfig && (
        <div className="px-6 py-3 bg-[#080d14] border-b border-white/[0.08] text-xs flex flex-wrap items-center gap-4 animate-fadeIn">
          <label className="flex items-center space-x-2 cursor-pointer text-slate-300">
            <input
              type="checkbox"
              checked={useParentChild}
              onChange={(e) => setUseParentChild(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0"
            />
            <span>Hierarchical Small-to-Big Retrieval</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer text-slate-300">
            <input
              type="checkbox"
              checked={useHybrid}
              onChange={(e) => setUseHybrid(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0"
            />
            <span>Hybrid Dense + BM25 Fusion (RRF k=60)</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer text-slate-300">
            <input
              type="checkbox"
              checked={rerank}
              onChange={(e) => setRerank(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0"
            />
            <span>Cross-Encoder Neural Re-Ranking</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer text-slate-300">
            <input
              type="checkbox"
              checked={useHyde}
              onChange={(e) => setUseHyde(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0"
            />
            <span>HyDE (Hypothetical Document Embeddings)</span>
          </label>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6">
        {messages.length === 0 && !isStreaming ? (
          /* InterviewOS Reference Hero Screen */
          <div className="max-w-4xl mx-auto my-auto pt-4 pb-8 flex flex-col items-center text-center animate-fadeIn">
            <div className="w-full bg-[#0a0f18]/80 bg-grid-pattern border border-white/[0.08] rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-1/4 w-80 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-mono font-medium text-emerald-400 mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>• THE RESEARCH ROOM FOR AMBITIOUS ENGINEERS</span>
              </div>

              <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-[1.15] mb-4">
                Research like it's your <br />
                <span className="text-emerald-400 font-serif-accent italic font-normal text-3xl sm:text-5xl md:text-6xl">
                  dream company's
                </span>{" "}
                knowledge base.
              </h2>

              <p className="text-xs sm:text-sm font-mono text-slate-400 mb-6">
                // Live voice • Zero hallucination • Mathematical RRF scoring
              </p>

              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mx-auto leading-relaxed mb-8">
                A citation-grounded RAG agent that synthesizes complex documents, extracts structured tables, resolves hierarchical small-to-big context paragraphs, and provides verifiable inline source citations.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-3xl mx-auto mb-8 text-left">
                <div className="flex items-center space-x-2 p-2.5 bg-slate-900/60 border border-white/[0.06] rounded-xl text-xs text-slate-200">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-medium">Real Voice Speech</span>
                </div>
                <div className="flex items-center space-x-2 p-2.5 bg-slate-900/60 border border-white/[0.06] rounded-xl text-xs text-slate-200">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-medium">Gemini 3.6 Flash</span>
                </div>
                <div className="flex items-center space-x-2 p-2.5 bg-slate-900/60 border border-white/[0.06] rounded-xl text-xs text-slate-200">
                  <CheckCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="font-medium">Small-to-Big Retrieval</span>
                </div>
                <div className="flex items-center space-x-2 p-2.5 bg-slate-900/60 border border-white/[0.06] rounded-xl text-xs text-slate-200">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-medium">Brutally Grounded</span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-mono text-slate-400 block uppercase tracking-wider">
                  Quick Query Prompts:
                </span>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {quickPrompts.map((prompt, pIdx) => (
                    <button
                      key={pIdx}
                      onClick={() => {
                        if (selectedDocIds.length > 0) {
                          onSendMessage(prompt);
                        } else {
                          setInput(prompt);
                        }
                      }}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-white/10 hover:border-emerald-500/40 text-slate-300 hover:text-white text-xs rounded-xl transition-all text-left flex items-center space-x-1.5 cursor-pointer"
                    >
                      <span>{prompt}</span>
                      <ArrowRight className="w-3 h-3 text-emerald-400 opacity-60" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <MessageCard
              key={`msg-${idx}`}
              msg={msg}
              index={idx}
              isSpeaking={isSpeakingIndex === idx}
              isCopied={copiedIndex === idx}
              onInspect={handleInspect}
              onReadAloud={handleReadAloud}
              onCopy={handleCopyMessage}
              onCitationClick={handleCitationClick}
            />
          ))
        )}

        {/* Live Streaming Indicator */}
        {isStreaming && (
          <div className="flex flex-col items-start">
            <div className="max-w-3xl w-full rounded-2xl rounded-bl-none p-4 bg-[#0a0f18] border border-emerald-500/30 text-slate-200 shadow-xl">
              <div className="flex items-center space-x-2 pb-2 mb-2 border-b border-white/[0.08] text-[11px] font-mono text-emerald-400">
                <Sparkles className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                <span>SYNTHESIZING ANSWER WITH CITATIONS...</span>
              </div>
              <div className="whitespace-pre-wrap leading-relaxed text-sm text-slate-200 text-left">
                {currentStreamedAnswer.replace(/\[SOURCE:\s*[a-zA-Z0-9_-]+\s*\]/gi, "")}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Bottom Input Bar */}
      <div className="p-4 bg-[#06090e]/95 border-t border-white/[0.08] backdrop-blur-xl">
        {selectedDocIds.length === 0 && (
          <div className="mb-2.5 max-w-3xl mx-auto flex items-center space-x-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3.5 py-1.5 rounded-xl">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Select or upload at least one document from the sidebar to ask questions.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex items-center space-x-2">
          {/* Glowing Voice Dictation Mic Trigger */}
          <button
            type="button"
            onClick={toggleLiveSpeech}
            className={`p-3 rounded-2xl transition-all flex items-center justify-center cursor-pointer active:scale-95 ${
              isLiveListening
                ? "bg-rose-600 hover:bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-600/40"
                : "bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 glow-emerald-sm"
            }`}
            title={isLiveListening ? "Listening... Click to stop" : "Click to speak query (Live Speech-to-Text)"}
          >
            {isLiveListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Text Input Box */}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={selectedDocIds.length === 0 || isStreaming}
            placeholder={
              isLiveListening
                ? "🎙️ Listening... Speak your question now"
                : selectedDocIds.length === 0
                ? "Select a document to ask questions..."
                : isStreaming
                ? "Synthesizing answer..."
                : `Ask a question across ${selectedDocIds.length} document(s)...`
            }
            className={`flex-1 px-4 py-3 bg-[#0a0f18] border rounded-2xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors disabled:opacity-50 ${
              isLiveListening ? "border-rose-500 shadow-md shadow-rose-500/20" : "border-white/[0.08] focus:border-emerald-500"
            }`}
          />

          {/* Emerald Send Button */}
          <button
            type="submit"
            disabled={!input.trim() || isStreaming || selectedDocIds.length === 0}
            className="p-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed text-slate-950 font-bold rounded-2xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center cursor-pointer active:scale-95"
          >
            <Send className="w-5 h-5 fill-slate-950" />
          </button>
        </form>
      </div>

      {/* Voice Assistant Modal Fallback */}
      <VoiceAssistant
        isOpen={voiceModalOpen}
        onClose={() => setVoiceModalOpen(false)}
        onTranscriptComplete={handleVoiceTranscript}
      />

      {/* RAG Inspector Modal */}
      <RagInspector
        isOpen={Boolean(inspectorModalData)}
        onClose={() => setInspectorModalData(null)}
        inspectorData={inspectorModalData}
      />
    </div>
  );
}
