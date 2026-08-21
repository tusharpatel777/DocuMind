import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  Brain, 
  FileText, 
  X, 
  AlertCircle, 
  Plus, 
  Trash2, 
  MessageSquare, 
  Menu, 
  FolderOpen,
  Activity,
  Mic,
  CheckCircle,
  Play,
  Layers,
  ChevronRight,
  Flame,
  Zap
} from "lucide-react";
import Uploader from "./components/Uploader";
import DocumentList from "./components/DocumentList";
import Chat from "./components/Chat";
import { 
  fetchDocuments, 
  uploadDocument, 
  deleteDocument, 
  streamChatQuery,
  fetchSessions,
  fetchSessionDetails,
  deleteSession,
  fetchSessionEvaluations,
  fetchUserAnalytics
} from "./services/api";
import AnalyticsDashboard from "./components/AnalyticsDashboard";
import Login from "./components/Login";

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("documind_user_profile");
    return saved ? JSON.parse(saved) : null;
  });
  const [userId, setUserId] = useState(() => {
    const saved = localStorage.getItem("documind_user_profile");
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.email;
    }
    return "demo_user";
  });

  const [sessionId, setSessionId] = useState("");
  const [sessions, setSessions] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStreamedAnswer, setCurrentStreamedAnswer] = useState("");
  const [activeCitation, setActiveCitation] = useState(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  // Advanced RAG & Model state
  const [selectedProvider, setSelectedProvider] = useState("groq");
  const [selectedModel, setSelectedModel] = useState("llama-3.3-70b-versatile");
  const [useHyde, setUseHyde] = useState(false);
  const [rerank, setRerank] = useState(true);
  const [useHybrid, setUseHybrid] = useState(true);
  const [useParentChild, setUseParentChild] = useState(true);
  const [currentInspectorData, setCurrentInspectorData] = useState(null);

  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileLibraryOpen, setMobileLibraryOpen] = useState(false);

  // Load documents
  const loadDocuments = async (targetUserId = userId) => {
    if (!targetUserId) return;
    try {
      const docs = await fetchDocuments(targetUserId);
      setDocuments(docs);
    } catch (err) {
      console.error(err);
      setError("Failed to connect to the backend API.");
    }
  };

  // Load chat sessions (always sorted with newest on top)
  const loadSessions = async (targetSessionId = null, targetUserId = userId) => {
    if (!targetUserId) return;
    try {
      const data = await fetchSessions(targetUserId);
      // Ensure sessions are strictly sorted descending by created_at
      const sorted = [...data].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      setSessions(sorted);
      if (sorted.length > 0) {
        const activeId = targetSessionId || sorted[0].session_id;
        handleSelectSession(activeId);
      } else {
        handleNewChat();
      }
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
    }
  };

  useEffect(() => {
    if (userId) {
      loadDocuments(userId);
      loadSessions(null, userId);
    }
  }, [userId]);

  // Polling for document processing status
  useEffect(() => {
    const hasProcessing = documents.some((d) => d.status === "processing");
    if (!hasProcessing) return;

    const interval = setInterval(async () => {
      try {
        const docs = await fetchDocuments(userId);
        setDocuments(docs);
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [documents, userId]);

  const handleSelectSession = async (sessId) => {
    if (!sessId) return;
    setSessionId(sessId);
    setActiveCitation(null);
    setError("");
    setMobileMenuOpen(false);
    try {
      const details = await fetchSessionDetails(sessId);
      const formattedMessages = [];
      if (details && details.turns && details.turns.length > 0) {
        details.turns.forEach((turn) => {
          formattedMessages.push({ 
            type: "user", 
            role: "user",
            content: turn.query || turn.prompt || "" 
          });
          formattedMessages.push({
            type: "assistant",
            role: "assistant",
            content: turn.answer || turn.content || "",
            citations: turn.citations || [],
            provider: turn.info?.provider || turn.provider || "groq",
            faithfulness: turn.faithfulness,
            answer_relevancy: turn.answer_relevancy,
            rag_inspector: turn.rag_inspector
          });
        });
      }
      setMessages(formattedMessages);
      if (details && details.doc_ids && details.doc_ids.length > 0) {
        setSelectedDocIds(details.doc_ids);
      }
    } catch (err) {
      console.warn("Session history not yet in database or empty:", err);
      setMessages([]);
    }
  };

  const handleNewChat = () => {
    const newId = `sess_${Math.random().toString(36).substring(7)}`;
    setSessionId(newId);
    setMessages([]);
    setActiveCitation(null);
    setError("");
    setMobileMenuOpen(false);

    // Prepend new conversation placeholder immediately to the top of sessions
    setSessions((prev) => [
      {
        session_id: newId,
        summary: "New Conversation",
        created_at: new Date().toISOString(),
        doc_ids: selectedDocIds
      },
      ...prev.filter((s) => s.session_id !== newId)
    ]);
  };

  const handleDeleteSession = async (e, sessId) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this conversation?")) return;
    try {
      await deleteSession(sessId);
      const remaining = sessions.filter((s) => s.session_id !== sessId);
      setSessions(remaining);
      if (sessId === sessionId) {
        if (remaining.length > 0) {
          handleSelectSession(remaining[0].session_id);
        } else {
          handleNewChat();
        }
      }
    } catch (err) {
      console.error(err);
      setError("Failed to delete chat session.");
    }
  };

  const handleUploadComplete = async (file) => {
    setError("");
    try {
      const newDoc = await uploadDocument(file, userId);
      setDocuments((prev) => [newDoc, ...prev]);
      setSelectedDocIds((prev) => [...prev, newDoc.doc_id]);
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const handleDeleteDocument = async (docId) => {
    setError("");
    setIsDeleting(true);
    try {
      await deleteDocument(docId, userId);
      setDocuments((prev) => prev.filter((d) => d.doc_id !== docId));
      setSelectedDocIds((prev) => prev.filter((id) => id !== docId));
      if (activeCitation?.doc_name && documents.find((d) => d.doc_id === docId)?.title === activeCitation.doc_name) {
        setActiveCitation(null);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to delete document.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleSelect = (docId) => {
    setSelectedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  const handleSendMessage = async (queryText) => {
    if (!selectedDocIds || selectedDocIds.length === 0) {
      setError("Please select at least one document in your library to query.");
      return;
    }

    setError("");
    setIsStreaming(true);
    setCurrentStreamedAnswer("");
    setCurrentInspectorData(null);

    setMessages((prev) => [...prev, { type: "user", content: queryText }]);

    // Update conversation title at the top of the session list immediately
    const summaryTitle = queryText.length > 32 ? queryText.substring(0, 32) + "..." : queryText;
    setSessions((prev) => [
      {
        session_id: sessionId,
        summary: summaryTitle,
        created_at: new Date().toISOString(),
        doc_ids: selectedDocIds
      },
      ...prev.filter((s) => s.session_id !== sessionId)
    ]);

    let accumulatedAnswer = "";
    let finalCitations = [];
    let inspectorDataReceived = null;

    await streamChatQuery({
      query: queryText,
      sessionId,
      userId,
      docIds: selectedDocIds,
      provider: selectedProvider,
      model: selectedModel,
      useHyde,
      rerank,
      useHybrid,
      useParentChild,
      onToken: (token) => {
        accumulatedAnswer += token;
        setCurrentStreamedAnswer(accumulatedAnswer);
      },
      onInspector: (inspectorData) => {
        inspectorDataReceived = inspectorData;
        setCurrentInspectorData(inspectorData);
      },
      onCitations: (citations) => {
        finalCitations = citations;
      },
      onDone: (doneData) => {
        if (doneData.inspector) {
          inspectorDataReceived = doneData.inspector;
          setCurrentInspectorData(doneData.inspector);
        }
      },
      onError: (errorMsg) => {
        setError(errorMsg);
        setIsStreaming(false);
      }
    });

    setMessages((prev) => [
      ...prev,
      {
        type: "assistant",
        content: accumulatedAnswer,
        citations: finalCitations,
        provider: selectedProvider,
        rag_inspector: inspectorDataReceived
      }
    ]);

    setIsStreaming(false);
    setCurrentStreamedAnswer("");

    try {
      const data = await fetchSessions(userId);
      const sorted = [...data].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      setSessions(sorted);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenAnalytics = async () => {
    try {
      const data = await fetchUserAnalytics(userId);
      setAnalyticsData(data);
      setShowAnalytics(true);
    } catch (err) {
      console.error("Failed to load analytics:", err);
      setError("Failed to fetch platform analytics.");
    }
  };

  const handleLoginSuccess = (profile) => {
    localStorage.setItem("documind_user_profile", JSON.stringify(profile));
    localStorage.setItem("documind_user_id", profile.email);
    setUser(profile);
    setUserId(profile.email);
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to sign out?")) {
      localStorage.removeItem("documind_user_profile");
      localStorage.removeItem("documind_user_id");
      setUser(null);
      setUserId("");
      setSessions([]);
      setDocuments([]);
      setMessages([]);
      setSelectedDocIds([]);
    }
  };

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="relative h-[100dvh] w-full bg-[#06090e] text-slate-100 flex flex-col font-sans overflow-hidden bg-radial-glow">
      {/* Background ambient neon glows */}
      <div className="absolute top-0 left-1/3 w-[600px] h-[350px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none pulse-glow-emerald" />
      <div className="absolute bottom-0 right-1/4 w-[450px] h-[450px] bg-emerald-950/20 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Reference-Style Header */}
      <header className="flex-shrink-0 border-b border-white/[0.08] bg-[#06090e]/90 backdrop-blur-xl z-50 px-4 sm:px-6 py-3 flex items-center justify-between">
        {/* Left: Brand Logo & Title */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-400 hover:text-white bg-slate-900/60 rounded-xl border border-white/10 transition cursor-pointer"
            title="Toggle Menu"
          >
            <Menu className="w-4 h-4" />
          </button>

          {/* Glowing Emerald Icon (InterviewOS Reference Style) */}
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 glow-emerald-sm transition-transform hover:scale-105">
            <Mic className="w-4 h-4 fill-emerald-400/20" />
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold tracking-tight text-white flex items-center">
                DocuMind <span className="text-emerald-400 ml-1 font-serif-accent italic font-normal text-lg">AI 2.0</span>
              </h1>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
                Live Grounded
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden md:block">
              Interactive Citation-Grounded Research Engine
            </p>
          </div>
        </div>

        {/* Center/Right: Badges, Actions & Start Q&A Button */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Quick Stats / Badges */}
          <div className="hidden xl:flex items-center space-x-2 text-xs text-slate-300 bg-slate-900/80 border border-white/[0.08] px-3 py-1.5 rounded-xl">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-mono font-semibold text-white">RRF k=60</span>
            <span className="text-slate-600">|</span>
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-mono text-emerald-400">&lt;15ms Cache</span>
          </div>

          <button
            onClick={() => setMobileLibraryOpen(!mobileLibraryOpen)}
            className="lg:hidden p-2 text-slate-400 hover:text-emerald-400 bg-slate-900/60 rounded-xl border border-white/10 transition"
            title="Open Document Library"
          >
            <FolderOpen className="w-4 h-4" />
          </button>

          <button
            onClick={handleOpenAnalytics}
            className="hidden sm:flex text-xs font-medium text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-850 border border-white/[0.08] px-3 py-1.5 rounded-xl transition items-center space-x-1.5"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Analytics</span>
          </button>

          {/* Primary Action Button (Reference Style Green Pill) */}
          <button
            onClick={handleNewChat}
            className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/25 flex items-center space-x-1.5 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-slate-950" />
            <span>New Chat</span>
          </button>

          {/* User Profile Avatar */}
          {user && (
            <div className="flex items-center space-x-2 bg-slate-900/80 pl-2 pr-1.5 py-1 rounded-xl border border-white/[0.08]">
              {user.picture ? (
                <img
                  src={user.picture}
                  alt="Avatar"
                  className="w-6 h-6 rounded-full border border-emerald-500/30"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold text-white">
                  {user.name ? user.name[0] : "T"}
                </div>
              )}
              <button
                onClick={handleLogout}
                className="px-1.5 py-0.5 hover:bg-rose-950/40 hover:text-rose-400 text-[10px] font-medium text-slate-400 rounded-lg transition"
                title="Sign out"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Workspace Arena */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        
        {mobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-30 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Sessions Sidebar */}
        <aside className={`fixed inset-y-0 left-0 w-64 bg-[#080d14]/98 border-r border-white/[0.08] flex flex-col z-40 transition-transform duration-300 transform ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        } md:relative md:translate-x-0 md:flex flex-shrink-0`}>
          <div className="p-3.5 border-b border-white/[0.08] flex items-center justify-between gap-2">
            <button
              onClick={handleNewChat}
              className="flex-1 py-2 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Conversation</span>
            </button>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden p-1.5 text-slate-400 hover:text-white bg-slate-900 rounded-lg border border-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Conversation List (Newest on Top) */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
            {sessions.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500 italic">
                No recent conversations
              </div>
            ) : (
              sessions.map((sess, idx) => {
                const isActive = sess.session_id === sessionId;
                return (
                  <div
                    key={sess.session_id || idx}
                    onClick={() => handleSelectSession(sess.session_id)}
                    className={`group relative flex items-center justify-between p-2.5 rounded-xl cursor-pointer border transition-all duration-200 ${
                      isActive
                        ? "bg-emerald-500/15 border-emerald-500/40 text-white shadow-sm"
                        : "bg-transparent border-transparent text-slate-400 hover:bg-slate-900 hover:text-slate-200 hover:border-white/5"
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 overflow-hidden flex-1 pr-2">
                      <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? "text-emerald-400" : "text-slate-500"}`} />
                      <span className="text-xs truncate font-medium text-left">
                        {sess.summary || "Conversation"}
                      </span>
                    </div>

                    {/* Delete Conversation Trash Icon */}
                    <button
                      onClick={(e) => handleDeleteSession(e, sess.session_id)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 rounded-lg transition-all"
                      title="Delete this conversation"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {mobileLibraryOpen && (
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-30 lg:hidden"
            onClick={() => setMobileLibraryOpen(false)}
          />
        )}

        {/* Documents Manager Sidebar */}
        <aside className={`fixed inset-y-0 right-0 w-80 max-w-[calc(100vw-3rem)] bg-[#080d14]/98 lg:bg-[#080d14]/95 border-l lg:border-l-0 lg:border-r border-white/[0.08] flex flex-col z-40 p-4 space-y-5 transition-transform duration-300 transform ${
          mobileLibraryOpen ? "translate-x-0" : "translate-x-full"
        } lg:relative lg:translate-x-0 lg:flex flex-shrink-0 overflow-hidden`}>
          <div className="flex items-center justify-between pb-1 border-b border-white/[0.08] lg:border-none lg:pb-0 flex-shrink-0">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Document Manager</h2>
            <button
              onClick={() => setMobileLibraryOpen(false)}
              className="lg:hidden p-1.5 text-slate-400 hover:text-white bg-slate-900 rounded-lg border border-white/10"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-shrink-0">
            <Uploader
              onUploadComplete={handleUploadComplete}
              isUploading={isUploading}
              setIsUploading={setIsUploading}
            />
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2.5 flex-shrink-0">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Indexed Documents</h2>
              <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/30 font-semibold">
                {selectedDocIds.length} / {documents.length} Selected
              </span>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
              <DocumentList
                documents={documents}
                selectedDocIds={selectedDocIds}
                onToggleSelect={handleToggleSelect}
                onDelete={handleDeleteDocument}
                isDeleting={isDeleting}
              />
            </div>
          </div>
        </aside>

        {/* Central Chat Arena */}
        <main className="flex-1 flex overflow-hidden relative">
          <div className="flex-1 flex flex-col h-full relative overflow-hidden">
            {error && (
              <div className="m-4 p-3 bg-rose-950/30 border border-rose-500/30 rounded-xl flex items-center space-x-2 text-rose-400 text-xs animate-fadeIn">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <Chat
              messages={messages}
              onSendMessage={handleSendMessage}
              onDeleteCurrentSession={() => handleDeleteSession(null, sessionId)}
              isStreaming={isStreaming}
              currentStreamedAnswer={currentStreamedAnswer}
              selectedDocIds={selectedDocIds}
              activeCitation={activeCitation}
              setActiveCitation={setActiveCitation}
              useHyde={useHyde}
              setUseHyde={setUseHyde}
              rerank={rerank}
              setRerank={setRerank}
              useHybrid={useHybrid}
              setUseHybrid={setUseHybrid}
              useParentChild={useParentChild}
              setUseParentChild={setUseParentChild}
              selectedProvider={selectedProvider}
              setSelectedProvider={setSelectedProvider}
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
              currentInspectorData={currentInspectorData}
            />
          </div>

          {/* Active Verified Citation Sidebar */}
          {activeCitation && (
            <div className="fixed inset-y-0 right-0 md:relative w-80 max-w-[calc(100vw-3rem)] border-l border-white/[0.08] bg-[#080d14]/98 p-5 flex flex-col justify-between shadow-2xl z-40 flex-shrink-0">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Verified Source Passage</span>
                  </div>
                  <button
                    onClick={() => setActiveCitation(null)}
                    className="p-1 hover:bg-slate-800 rounded-lg text-slate-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-left space-y-2">
                  <p className="text-xs font-medium text-slate-400 truncate">
                    Document: <span className="text-slate-200 font-semibold">{activeCitation.doc_name}</span>
                  </p>
                  <p className="text-xs font-medium text-slate-400">
                    Location: <span className="text-emerald-400 px-2 py-0.5 bg-emerald-500/10 rounded-md border border-emerald-500/30 font-mono text-[11px]">Page {activeCitation.page}</span>
                  </p>
                </div>

                <div className="p-4 bg-slate-950/80 border border-white/[0.08] rounded-xl text-xs leading-relaxed text-slate-200 text-left max-h-[350px] overflow-y-auto italic font-sans border-l-2 border-l-emerald-500">
                  "{activeCitation.text}"
                </div>
              </div>

              <div className="text-[10px] text-slate-500 text-left mt-4 border-t border-white/[0.08] pt-3 flex items-center space-x-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Mathematically citation-grounded to source paragraph.</span>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Analytics Modal */}
      {showAnalytics && (
        <AnalyticsDashboard
          analytics={analyticsData}
          onClose={() => setShowAnalytics(false)}
        />
      )}
    </div>
  );
}
