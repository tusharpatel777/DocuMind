import React, { useState, useRef, useEffect } from "react";
import { 
  Send, 
  Sparkles, 
  AlertCircle, 
  FileText, 
  Mic, 
  MicOff,
  Volume2, 
  VolumeX, 
  Activity, 
  Download, 
  Copy, 
  Check, 
  Layers, 
  Zap, 
  Settings2,
  Trash2,
  CheckCircle,
  Play,
  ArrowRight,
  ShieldCheck,
  ExternalLink
} from "lucide-react";
import RagInspector from "./RagInspector";
import VoiceAssistant from "./VoiceAssistant";

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
  }, [messages, currentStreamedAnswer]);

  // Clean up speech recognition on unmount
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
      // If Web Speech API not supported in browser, open modal fallback
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
  };

  const handleCopyMessage = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

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

  // Helper to parse bold, links, and inline citations inside a text snippet
  const renderInlineStyles = (lineText, citations, keyPrefix) => {
    const citationRegex = /\[SOURCE:\s*([a-zA-Z0-9_-]+)\s*\]/gi;
    let parts = [];
    let lastIdx = 0;
    let match;

    while ((match = citationRegex.exec(lineText)) !== null) {
      const start = match.index;
      const chunkId = match[1];

      if (start > lastIdx) {
        parts.push(lineText.substring(lastIdx, start));
      }

      const citeIndex = citations.findIndex(
        (c) => c.chunk_id?.toLowerCase() === chunkId.trim().toLowerCase()
      );

      if (citeIndex !== -1) {
        const citation = citations[citeIndex];
        parts.push(
          <button
            key={`${keyPrefix}-cite-${chunkId}-${start}`}
            onClick={() => setActiveCitation(citation)}
            className="inline-flex items-center justify-center px-1.5 py-0.5 mx-0.5 text-[10px] font-bold bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-md cursor-pointer transition-all duration-200 align-super"
            title={`${citation.doc_name} (Page ${citation.page})`}
          >
            [{citeIndex + 1}]
          </button>
        );
      } else {
        parts.push(
          <span key={`${keyPrefix}-missing-${start}`} className="text-slate-500 text-[10px] mx-0.5 align-super">
            [*]
          </span>
        );
      }

      lastIdx = citationRegex.lastIndex;
    }

    if (lastIdx < lineText.length) {
      parts.push(lineText.substring(lastIdx));
    }

    // Now format bold text (**bold**) and markdown links [text](url)
    return parts.map((part, pIdx) => {
      if (typeof part !== "string") return part;

      // Parse bold **text**
      const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
      return boldParts.map((bPart, bIdx) => {
        if (bPart.startsWith("**") && bPart.endsWith("**")) {
          const boldContent = bPart.slice(2, -2);
          return <strong key={`${keyPrefix}-b-${pIdx}-${bIdx}`} className="font-bold text-white">{boldContent}</strong>;
        }

        // Parse markdown links [title](url)
        const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
        let linkElements = [];
        let linkLast = 0;
        let lMatch;

        while ((lMatch = linkRegex.exec(bPart)) !== null) {
          if (lMatch.index > linkLast) {
            linkElements.push(bPart.substring(linkLast, lMatch.index));
          }
          linkElements.push(
            <a
              key={`${keyPrefix}-link-${lMatch.index}`}
              href={lMatch[2]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:text-emerald-300 underline inline-flex items-center space-x-0.5"
            >
              <span>{lMatch[1]}</span>
              <ExternalLink className="w-2.5 h-2.5 ml-0.5 inline" />
            </a>
          );
          linkLast = linkRegex.lastIndex;
        }

        if (linkLast < bPart.length) {
          linkElements.push(bPart.substring(linkLast));
        }

        return linkElements.length > 0 ? linkElements : bPart;
      });
    });
  };

  // Rich Multi-Line Markdown Renderer
  const renderFormattedContent = (msg) => {
    const text = msg.content || "";
    const citations = msg.citations || [];

    if (!text) return null;

    const lines = text.split("\n");
    const renderedNodes = [];

    lines.forEach((line, lineIdx) => {
      const trimmed = line.trim();

      // Heading 3: ### Title
      if (trimmed.startsWith("### ")) {
        const title = trimmed.replace(/^###\s+/, "");
        renderedNodes.push(
          <h3 key={`h3-${lineIdx}`} className="text-sm font-bold text-emerald-400 mt-4 mb-2 flex items-center space-x-2 border-b border-white/[0.06] pb-1">
            <span>{renderInlineStyles(title, citations, `h3-${lineIdx}`)}</span>
          </h3>
        );
      }
      // Heading 2: ## Title
      else if (trimmed.startsWith("## ")) {
        const title = trimmed.replace(/^##\s+/, "");
        renderedNodes.push(
          <h2 key={`h2-${lineIdx}`} className="text-base font-bold text-white mt-4 mb-2 pb-1 border-b border-emerald-500/30">
            {renderInlineStyles(title, citations, `h2-${lineIdx}`)}
          </h2>
        );
      }
      // Heading 1: # Title
      else if (trimmed.startsWith("# ")) {
        const title = trimmed.replace(/^#\s+/, "");
        renderedNodes.push(
          <h1 key={`h1-${lineIdx}`} className="text-lg font-extrabold text-white mt-4 mb-2">
            {renderInlineStyles(title, citations, `h1-${lineIdx}`)}
          </h1>
        );
      }
      // Divider: ---
      else if (trimmed === "---" || trimmed === "***") {
        renderedNodes.push(
          <hr key={`hr-${lineIdx}`} className="border-t border-white/[0.08] my-3" />
        );
      }
      // Bullet list item: * or -
      else if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
        const itemText = trimmed.replace(/^[*-\s]+/, "");
        renderedNodes.push(
          <div key={`li-${lineIdx}`} className="flex items-start space-x-2 my-1 text-slate-200 pl-1 text-sm leading-relaxed">
            <span className="text-emerald-400 text-base leading-tight select-none">•</span>
            <div className="flex-1">{renderInlineStyles(itemText, citations, `li-${lineIdx}`)}</div>
          </div>
        );
      }
      // Blank line
      else if (!trimmed) {
        renderedNodes.push(<div key={`sp-${lineIdx}`} className="h-2" />);
      }
      // Regular paragraph line
      else {
        renderedNodes.push(
          <p key={`p-${lineIdx}`} className="text-sm text-slate-200 leading-relaxed my-1">
            {renderInlineStyles(line, citations, `p-${lineIdx}`)}
          </p>
        );
      }
    });

    return <div className="space-y-0.5 text-left">{renderedNodes}</div>;
  };

  const renderStreamingContent = (text) => {
    const cleanText = text.replace(/\[SOURCE:\s*[a-zA-Z0-9_-]+\s*\]/gi, "");
    return <div className="whitespace-pre-wrap leading-relaxed text-sm text-slate-200 text-left">{cleanText}</div>;
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
          {/* Provider/Model Selector */}
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
          messages.map((msg, idx) => {
            const isUser = msg.type === "user" || msg.role === "user";
            return (
              <div
                key={idx}
                className={`flex flex-col ${
                  isUser ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-3xl rounded-2xl p-4 shadow-lg transition-all ${
                    isUser
                      ? "bg-slate-900 border border-emerald-500/30 text-white rounded-br-none"
                      : "bg-[#0a0f18] border border-white/[0.08] text-slate-200 rounded-bl-none w-full"
                  }`}
                >
                  {/* Assistant Message Header */}
                  {!isUser && (
                    <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/[0.08] text-[11px] font-mono text-slate-400">
                      <div className="flex items-center space-x-2">
                        <span className="text-emerald-400 font-bold tracking-wider">
                          {msg.provider ? msg.provider.toUpperCase() : "DOCUMIND"}
                        </span>
                        {msg.cache_hit && (
                          <span className="text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/30">
                            ⚡ CACHE HIT (&lt;15ms)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-1.5">
                        {/* RAG Inspector Button */}
                        {(msg.rag_inspector || currentInspectorData) && (
                          <button
                            onClick={() => setInspectorModalData(msg.rag_inspector || currentInspectorData)}
                            className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 flex items-center space-x-1 transition-colors cursor-pointer"
                            title="Open RAG Pipeline Inspector"
                          >
                            <Activity className="w-3 h-3" />
                            <span>Inspect</span>
                          </button>
                        )}

                        {/* Read Aloud TTS */}
                        <button
                          onClick={() => handleReadAloud(msg.content, idx)}
                          className={`p-1 rounded-lg hover:bg-slate-800 transition-colors ${
                            isSpeakingIndex === idx ? "text-emerald-400 animate-pulse" : "text-slate-400 hover:text-slate-200"
                          }`}
                          title="Read aloud"
                        >
                          {isSpeakingIndex === idx ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                        </button>

                        {/* Copy */}
                        <button
                          onClick={() => handleCopyMessage(msg.content, idx)}
                          className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
                          title="Copy text"
                        >
                          {copiedIndex === idx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Content Body */}
                  {isUser ? (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-100">{msg.content}</p>
                  ) : (
                    renderFormattedContent(msg)
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Live Streaming Indicator */}
        {isStreaming && (
          <div className="flex flex-col items-start">
            <div className="max-w-3xl w-full rounded-2xl rounded-bl-none p-4 bg-[#0a0f18] border border-emerald-500/30 text-slate-200 shadow-xl">
              <div className="flex items-center space-x-2 pb-2 mb-2 border-b border-white/[0.08] text-[11px] font-mono text-emerald-400">
                <Sparkles className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                <span>SYNTHESIZING ANSWER WITH CITATIONS...</span>
              </div>
              {renderStreamingContent(currentStreamedAnswer)}
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
