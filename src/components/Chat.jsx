import React, { useState, useRef, useEffect } from "react";
import { 
  Send, 
  Sparkles, 
  AlertCircle, 
  FileText, 
  Mic, 
  Volume2, 
  VolumeX, 
  Activity, 
  Download, 
  Copy, 
  Check, 
  Layers, 
  Zap, 
  Settings2,
  ChevronDown
} from "lucide-react";
import RagInspector from "./RagInspector";
import VoiceAssistant from "./VoiceAssistant";

export default function Chat({
  messages,
  onSendMessage,
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
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [inspectorModalData, setInspectorModalData] = useState(null);
  const [isSpeakingIndex, setIsSpeakingIndex] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [showConfig, setShowConfig] = useState(false);

  const messagesEndRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis || null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentStreamedAnswer]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isStreaming || selectedDocIds.length === 0) return;
    onSendMessage(input.trim());
    setInput("");
  };

  const handleVoiceTranscript = (text) => {
    setInput(text);
  };

  // Text-To-Speech
  const handleReadAloud = (text, index) => {
    if (!synthRef.current) return;

    if (isSpeakingIndex === index) {
      synthRef.current.cancel();
      setIsSpeakingIndex(null);
      return;
    }

    synthRef.current.cancel();
    // Clean citation brackets for smoother natural speech
    const cleanText = text.replace(/\[SOURCE:\s*[a-zA-Z0-9_-]+\s*\]/gi, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      setIsSpeakingIndex(null);
    };

    utterance.onerror = () => {
      setIsSpeakingIndex(null);
    };

    setIsSpeakingIndex(index);
    synthRef.current.speak(utterance);
  };

  const handleCopyMessage = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleExportChat = () => {
    if (messages.length === 0) return;
    let mdContent = `# DocuMind AI Conversation Export\n\nDate: ${new Date().toLocaleString()}\n\n---\n\n`;
    messages.forEach((m, idx) => {
      if (m.type === "user") {
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

  const renderFormattedContent = (msg) => {
    const text = msg.content;
    const citations = msg.citations || [];
    
    if (!text) return "";
    
    const regex = /\[SOURCE:\s*([a-zA-Z0-9_-]+)\s*\]/gi;
    const elements = [];
    let lastIndex = 0;
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      const matchIndex = match.index;
      const chunkId = match[1];
      
      if (matchIndex > lastIndex) {
        elements.push(text.substring(lastIndex, matchIndex));
      }
      
      const citeIndex = citations.findIndex(
        (c) => c.chunk_id?.toLowerCase() === chunkId.trim().toLowerCase()
      );
      
      if (citeIndex !== -1) {
        const citation = citations[citeIndex];
        elements.push(
          <button
            key={`cite-${chunkId}-${matchIndex}`}
            onClick={() => setActiveCitation(citation)}
            className="inline-flex items-center justify-center px-1.5 py-0.5 mx-0.5 text-[10px] font-bold bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/20 rounded cursor-pointer transition-all duration-200 align-super"
            title={`${citation.doc_name} (Page ${citation.page})`}
          >
            [{citeIndex + 1}]
          </button>
        );
      } else {
        elements.push(
          <span key={`cite-missing-${matchIndex}`} className="text-slate-500 text-[10px] select-none mx-0.5 align-super">
            [*]
          </span>
        );
      }
      
      lastIndex = regex.lastIndex;
    }
    
    if (lastIndex < text.length) {
      elements.push(text.substring(lastIndex));
    }
    
    return <div className="whitespace-pre-wrap leading-relaxed text-sm">{elements.length > 0 ? elements : text}</div>;
  };

  const renderStreamingContent = (text) => {
    const cleanText = text.replace(/\[SOURCE:\s*[a-zA-Z0-9_-]+\s*\]/gi, "");
    return <div className="whitespace-pre-wrap leading-relaxed text-sm">{cleanText}</div>;
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/60 relative overflow-hidden">
      {/* Top Bar: Model Selector + Retrieval Flags + Actions */}
      <div className="px-6 py-3.5 border-b border-slate-800 bg-slate-950/40 backdrop-blur-md flex items-center justify-between z-10">
        <div className="flex items-center space-x-3">
          {/* Provider/Model Selector */}
          <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-800 rounded-xl p-1">
            <button
              onClick={() => {
                setSelectedProvider("groq");
                setSelectedModel("llama-3.3-70b-versatile");
              }}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                selectedProvider === "groq"
                  ? "bg-indigo-600 text-white shadow-sm"
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
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center space-x-1 ${
                selectedProvider === "gemini"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>Gemini 3.6 Flash</span>
            </button>
          </div>

          {/* Retrieval Badges */}
          <div className="hidden lg:flex items-center space-x-2 text-[11px] font-mono text-slate-400 pl-2">
            <span className={`px-2 py-0.5 rounded border ${useParentChild ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-slate-900 text-slate-500 border-slate-800"}`}>
              Small-to-Big
            </span>
            <span className={`px-2 py-0.5 rounded border ${useHybrid ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" : "bg-slate-900 text-slate-500 border-slate-800"}`}>
              Hybrid RRF
            </span>
            <span className={`px-2 py-0.5 rounded border ${rerank ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-slate-900 text-slate-500 border-slate-800"}`}>
              MiniLM Rerank
            </span>
          </div>
        </div>

        {/* Right Tools */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className={`p-2 rounded-xl border transition-colors ${
              showConfig ? "bg-indigo-600/20 border-indigo-500 text-indigo-400" : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
            }`}
            title="Configure RAG Retrieval Parameters"
          >
            <Settings2 className="w-4 h-4" />
          </button>

          {messages.length > 0 && (
            <button
              onClick={handleExportChat}
              className="p-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"
              title="Export Conversation as Markdown"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Expandable Configuration Drawer */}
      {showConfig && (
        <div className="px-6 py-3 bg-slate-950 border-b border-slate-800 text-xs flex flex-wrap items-center gap-4 animate-fadeIn">
          <label className="flex items-center space-x-2 cursor-pointer text-slate-300">
            <input
              type="checkbox"
              checked={useParentChild}
              onChange={(e) => setUseParentChild(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0"
            />
            <span>Hierarchical Small-to-Big Retrieval</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer text-slate-300">
            <input
              type="checkbox"
              checked={useHybrid}
              onChange={(e) => setUseHybrid(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0"
            />
            <span>Hybrid Dense + BM25 Fusion (RRF k=60)</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer text-slate-300">
            <input
              type="checkbox"
              checked={rerank}
              onChange={(e) => setRerank(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0"
            />
            <span>Cross-Encoder Neural Re-Ranking</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer text-slate-300">
            <input
              type="checkbox"
              checked={useHyde}
              onChange={(e) => setUseHyde(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0"
            />
            <span>HyDE (Hypothetical Document Embeddings)</span>
          </label>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {messages.length === 0 && !isStreaming ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-500/20 to-emerald-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4 shadow-xl">
              <Sparkles className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              DocuMind AI Enterprise
            </h3>
            <p className="text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
              Ask deep questions over your uploaded documents with multi-modal voice input, Google Gemini 2.0 Flash, and precision citation grounding.
            </p>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setVoiceOpen(true)}
                className="px-4 py-2 bg-indigo-600/20 border border-indigo-500/30 hover:bg-indigo-600/30 text-indigo-300 text-xs font-semibold rounded-xl flex items-center space-x-2 transition-all"
              >
                <Mic className="w-4 h-4 text-indigo-400" />
                <span>Try Voice Question</span>
              </button>
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${
                msg.type === "user" ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`max-w-3xl rounded-2xl p-4 shadow-md transition-all ${
                  msg.type === "user"
                    ? "bg-indigo-600 text-white rounded-br-none"
                    : "bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none w-full"
                }`}
              >
                {/* Assistant Header / Badges */}
                {msg.type === "assistant" && (
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80 text-[11px] font-mono text-slate-400">
                    <div className="flex items-center space-x-2">
                      <span className="text-indigo-400 font-bold">
                        {msg.provider ? msg.provider.toUpperCase() : "DOCUMIND"}
                      </span>
                      {msg.cache_hit && (
                        <span className="text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                          ⚡ CACHE HIT
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-1.5">
                      {/* RAG Inspector Button */}
                      {(msg.rag_inspector || currentInspectorData) && (
                        <button
                          onClick={() => setInspectorModalData(msg.rag_inspector || currentInspectorData)}
                          className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 flex items-center space-x-1 transition-colors"
                          title="Open RAG Pipeline Inspector"
                        >
                          <Activity className="w-3 h-3" />
                          <span>Inspect</span>
                        </button>
                      )}

                      {/* Read Aloud TTS */}
                      <button
                        onClick={() => handleReadAloud(msg.content, idx)}
                        className={`p-1 rounded hover:bg-slate-800 transition-colors ${
                          isSpeakingIndex === idx ? "text-indigo-400 animate-pulse" : "text-slate-400 hover:text-slate-200"
                        }`}
                        title="Read aloud"
                      >
                        {isSpeakingIndex === idx ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                      </button>

                      {/* Copy */}
                      <button
                        onClick={() => handleCopyMessage(msg.content, idx)}
                        className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition-colors"
                        title="Copy text"
                      >
                        {copiedIndex === idx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Content */}
                {msg.type === "user" ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                ) : (
                  renderFormattedContent(msg)
                )}
              </div>
            </div>
          ))
        )}

        {/* Live Stream Indicator */}
        {isStreaming && (
          <div className="flex flex-col items-start">
            <div className="max-w-3xl w-full rounded-2xl rounded-bl-none p-4 bg-slate-900 border border-indigo-500/30 text-slate-200 shadow-lg">
              <div className="flex items-center space-x-2 pb-2 mb-2 border-b border-slate-800 text-[11px] font-mono text-indigo-400">
                <Sparkles className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                <span>STREAMING RESPONSE...</span>
              </div>
              {renderStreamingContent(currentStreamedAnswer)}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Input Box */}
      <div className="p-4 bg-slate-950/60 border-t border-slate-800 backdrop-blur-md">
        {selectedDocIds.length === 0 && (
          <div className="mb-2.5 flex items-center space-x-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Please select or upload at least one document from the sidebar to start asking questions.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex items-center space-x-2">
          {/* Voice Input Trigger */}
          <button
            type="button"
            onClick={() => setVoiceOpen(true)}
            className="p-3 bg-slate-900 hover:bg-slate-800 text-indigo-400 hover:text-indigo-300 border border-slate-800 rounded-2xl transition-all shadow-sm flex items-center justify-center"
            title="Voice query (Whisper Large v3)"
          >
            <Mic className="w-5 h-5" />
          </button>

          {/* Text Input */}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={selectedDocIds.length === 0 || isStreaming}
            placeholder={
              selectedDocIds.length === 0
                ? "Select a document to ask questions..."
                : isStreaming
                ? "Synthesizing answer..."
                : `Ask a question across ${selectedDocIds.length} document(s)...`
            }
            className="flex-1 px-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={!input.trim() || isStreaming || selectedDocIds.length === 0}
            className="p-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>

      {/* Voice Assistant Modal */}
      <VoiceAssistant
        isOpen={voiceOpen}
        onClose={() => setVoiceOpen(false)}
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
