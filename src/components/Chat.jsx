import React, { useState, useRef, useEffect } from "react";
import { Send, ArrowUp, Sparkles, AlertCircle, FileText, ChevronRight } from "lucide-react";

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
  currentInfo
}) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

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
        (c) => c.chunk_id.toLowerCase() === chunkId.trim().toLowerCase()
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
            {citeIndex + 1}
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
    
    return <p className="whitespace-pre-wrap">{elements.length > 0 ? elements : text}</p>;
  };

  const renderStreamingContent = (text) => {
    const cleanText = text.replace(/\[SOURCE:\s*[a-zA-Z0-9_-]+\s*\]/gi, "");
    return <p className="whitespace-pre-wrap">{cleanText}</p>;
  };

  const renderRagasBadges = (msg) => {
    if (msg.faithfulness === undefined && msg.answer_relevancy === undefined) return null;
    
    const getScoreColor = (score) => {
      if (score === null || score === undefined) return "text-slate-500 bg-slate-900 border-slate-800/60";
      if (score >= 0.8) return "text-emerald-400 bg-emerald-950/20 border-emerald-500/25";
      if (score >= 0.5) return "text-amber-400 bg-amber-950/20 border-amber-500/25";
      return "text-red-400 bg-red-950/20 border-red-500/25";
    };
    
    const formatPercent = (score) => {
      if (score === null || score === undefined) return "Calculating...";
      return `${Math.round(score * 100)}%`;
    };

    return (
      <div className="flex items-center gap-2 mb-3">
        <div className={`text-[10px] font-bold px-2 py-1 rounded-md border flex items-center gap-1 ${getScoreColor(msg.faithfulness)}`}>
          <span>Faithfulness:</span>
          <span>{formatPercent(msg.faithfulness)}</span>
        </div>
        <div className={`text-[10px] font-bold px-2 py-1 rounded-md border flex items-center gap-1 ${getScoreColor(msg.answer_relevancy)}`}>
          <span>Relevancy:</span>
          <span>{formatPercent(msg.answer_relevancy)}</span>
        </div>
      </div>
    );
  };

  const getCitationsForMessage = (msg) => {
    const info = msg.info;
    const hasCitations = msg.citations && msg.citations.length > 0;
    const hasEval = msg.faithfulness !== undefined || msg.answer_relevancy !== undefined;
    
    if (!info && !hasCitations && !hasEval) return null;
    
    return (
      <div className="mt-4 pt-3 border-t border-slate-800/60">
        {hasEval && renderRagasBadges(msg)}

        {info && (
          <div className="text-[10px] text-slate-450 mb-2.5 flex items-center space-x-1.5 bg-emerald-950/10 px-2.5 py-1.5 rounded-lg border border-emerald-500/20">
            <Sparkles className="w-3 h-3 text-emerald-450" />
            <span>
              Retrieved {info.retrieved_count} chunks, re-ranked to top {info.reranked_count}
              {info.rerank_active ? " (Rerank: Active)" : " (Rerank: Inactive)"}
            </span>
          </div>
        )}
        
        {hasCitations && (
          <>
            <p className="text-xs font-semibold text-slate-400 mb-2 flex items-center">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 mr-1.5" />
              Verified Sources ({msg.citations.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {msg.citations.map((cite, i) => (
                <button
                   key={cite.chunk_id || i}
                  onClick={() => setActiveCitation(cite)}
                  className="text-xs px-2.5 py-1.5 bg-emerald-950/5 hover:bg-emerald-950/15 border border-slate-900 hover:border-emerald-500/25 rounded-lg flex items-center space-x-1.5 text-slate-300 transition-all duration-200"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-450 flex-shrink-0" />
                  <span className="truncate max-w-[120px]">{cite.doc_name}</span>
                  <span className="text-[10px] px-1 bg-slate-900 text-slate-500 rounded-md">
                    P. {cite.page}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#070b13]/20 border-l border-slate-900 overflow-hidden relative">
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5 scrollbar-thin scrollbar-thumb-slate-800">
        {messages.length === 0 && !currentStreamedAnswer && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
            <div className="p-3 bg-emerald-950/15 border border-emerald-500/20 rounded-full glow-emerald">
              <Sparkles className="w-8 h-8 text-emerald-450" />
            </div>
            <div className="max-w-xs">
              <h3 className="text-sm font-semibold text-slate-200">Start a Grounded Conversation</h3>
              <p className="text-xs text-slate-500 mt-1">
                Select one or more uploaded files from the library and ask any question. Every answer will be verified with citations.
              </p>
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-xl p-3.5 text-sm leading-relaxed text-left ${
                msg.role === "user"
                  ? "bg-emerald-950/25 text-emerald-50 border border-emerald-500/25 font-medium shadow-md shadow-emerald-950/10 rounded-br-none backdrop-blur-md"
                  : "bg-slate-900/60 text-slate-200 border border-slate-800/80 rounded-bl-none"
              }`}
            >
              {msg.role === "user" ? (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              ) : (
                renderFormattedContent(msg)
              )}
              {msg.role === "assistant" && getCitationsForMessage(msg)}
            </div>
            <span className="text-[10px] text-slate-500 mt-1 px-1">
              {msg.role === "user" ? "You" : "DocuMind AI"}
            </span>
          </div>
        ))}

        {isStreaming && (
          <div className="flex flex-col items-start">
            <div className="max-w-[85%] rounded-xl p-3.5 text-sm leading-relaxed text-left bg-slate-900/60 text-slate-200 border border-slate-880/80 rounded-bl-none">
              {currentStreamedAnswer ? (
                renderStreamingContent(currentStreamedAnswer)
              ) : (
                <div className="flex items-center space-x-1.5 py-1">
                  <div className="w-2 h-2 bg-emerald-450 rounded-full typing-dot"></div>
                  <div className="w-2 h-2 bg-emerald-450 rounded-full typing-dot"></div>
                  <div className="w-2 h-2 bg-emerald-450 rounded-full typing-dot"></div>
                </div>
              )}
              {currentInfo && currentInfo.type === "info_status" && (
                <div className="mt-3 pt-2.5 border-t border-slate-800/60 text-[10px] text-emerald-400 flex items-center space-x-1.5 animate-pulse">
                  <Sparkles className="w-3 h-3 text-emerald-400 flex-shrink-0 font-bold" />
                  <span className="font-semibold">{currentInfo.message}...</span>
                </div>
              )}
              {currentInfo && currentInfo.type === "info" && (
                <div className="mt-3 pt-2.5 border-t border-slate-800/60 text-[10px] text-slate-400 flex items-center space-x-1.5">
                  <Sparkles className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                  <span>
                    Retrieved {currentInfo.retrieved_count} chunks, re-ranked to top {currentInfo.reranked_count}
                    {currentInfo.rerank_active ? " (Rerank: Active)" : " (Rerank: Inactive)"}
                  </span>
                </div>
              )}
            </div>
            <span className="text-[10px] text-slate-500 mt-1 px-1">Thinking...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="px-4 py-2 sm:px-5 sm:py-2.5 bg-slate-950/35 border-t border-slate-900/80 flex items-center justify-between sm:justify-start gap-2 sm:gap-6 flex-shrink-0 z-10 overflow-x-auto scrollbar-none">
        <label className="flex items-center space-x-1.5 cursor-pointer group flex-shrink-0">
          <input
            type="checkbox"
            checked={useHybrid}
            onChange={(e) => setUseHybrid(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-slate-800 text-emerald-600 focus:ring-emerald-500/20 focus:ring-opacity-50 focus:ring-offset-0 bg-slate-900 cursor-pointer transition"
          />
          <span className="text-[10px] sm:text-xs text-slate-450 group-hover:text-slate-200 transition select-none">
            <span className="inline sm:hidden">Hybrid</span>
            <span className="hidden sm:inline">Hybrid Search (Dense + BM25)</span>
          </span>
        </label>
        
        <label className="flex items-center space-x-1.5 cursor-pointer group flex-shrink-0">
          <input
            type="checkbox"
            checked={rerank}
            onChange={(e) => setRerank(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-slate-800 text-emerald-600 focus:ring-emerald-500/20 focus:ring-opacity-50 focus:ring-offset-0 bg-slate-900 cursor-pointer transition"
          />
          <span className="text-[10px] sm:text-xs text-slate-450 group-hover:text-slate-200 transition select-none">
            <span className="inline sm:hidden">Re-rank</span>
            <span className="hidden sm:inline">Cross-Encoder Re-ranking</span>
          </span>
        </label>

        <label className="flex items-center space-x-1.5 cursor-pointer group flex-shrink-0">
          <input
            type="checkbox"
            checked={useHyde}
            onChange={(e) => setUseHyde(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-slate-800 text-emerald-600 focus:ring-emerald-500/20 focus:ring-opacity-50 focus:ring-offset-0 bg-slate-900 cursor-pointer transition"
          />
          <span className="text-[10px] sm:text-xs text-slate-450 group-hover:text-slate-200 transition select-none">
            <span className="inline sm:hidden">HyDE</span>
            <span className="hidden sm:inline">HyDE Query Expansion</span>
          </span>
        </label>
      </div>

      <form
        onSubmit={handleSubmit}
        className="p-3 sm:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-4 border-t border-slate-900/80 bg-slate-950/50 flex items-center space-x-2 flex-shrink-0"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            selectedDocIds.length === 0
              ? "Select documents from library to start chatting"
              : "Ask anything about selected documents..."
          }
          disabled={selectedDocIds.length === 0 || isStreaming}
          className="flex-1 min-w-0 px-4 py-2.5 sm:py-3 bg-slate-900/60 border border-slate-800 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 rounded-xl text-base text-slate-100 placeholder-slate-500 outline-none transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled={!input.trim() || isStreaming || selectedDocIds.length === 0}
          className="p-2.5 sm:p-3 bg-emerald-550/10 hover:bg-emerald-500/20 text-emerald-450 hover:text-emerald-300 border border-emerald-500/25 hover:border-emerald-400/50 rounded-xl transition-all duration-300 disabled:bg-slate-850 disabled:text-slate-500 disabled:border-transparent disabled:cursor-not-allowed shadow-[0_0_15px_rgba(16,185,129,0.05)]"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
