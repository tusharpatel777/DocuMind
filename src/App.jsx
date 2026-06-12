import React, { useState, useEffect } from "react";
import { Sparkles, Brain, FileText, X, AlertCircle, Plus, Trash2, MessageSquare, Menu, FolderOpen } from "lucide-react";
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
import { Activity } from "lucide-react";
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
    return "";
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

  const [useHyde, setUseHyde] = useState(false);
  const [rerank, setRerank] = useState(true);
  const [useHybrid, setUseHybrid] = useState(true);
  const [currentInfo, setCurrentInfo] = useState(null);

  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [isEditingWorkspace, setIsEditingWorkspace] = useState(false);
  const [workspaceInput, setWorkspaceInput] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileLibraryOpen, setMobileLibraryOpen] = useState(false);

  // Docs
  const loadDocuments = async (targetUserId = userId) => {
    try {
      const docs = await fetchDocuments(targetUserId);
      setDocuments(docs);
    } catch (err) {
      console.error(err);
      setError("Failed to connect to the backend API.");
    }
  };

  // Sessions
  const loadSessions = async (targetSessionId = null, targetUserId = userId) => {
    try {
      const data = await fetchSessions(targetUserId);
      setSessions(data);
      if (data.length > 0) {
        const activeId = targetSessionId || data[0].session_id;
        handleSelectSession(activeId);
      } else {
        handleNewChat();
      }
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
    }
  };

  useEffect(() => {
    loadDocuments(userId);
    loadSessions(null, userId);
  }, [userId]);

  // Poll
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
    setSessionId(sessId);
    setActiveCitation(null);
    setError("");
    setMobileMenuOpen(false);
    try {
      const details = await fetchSessionDetails(sessId);
      const formattedMessages = [];
      if (details.turns) {
        details.turns.forEach((turn) => {
          formattedMessages.push({ role: "user", content: turn.query });
          formattedMessages.push({
            role: "assistant",
            content: turn.answer,
            citations: turn.citations,
            info: turn.info,
            faithfulness: turn.faithfulness,
            answer_relevancy: turn.answer_relevancy
          });
        });
      }
      setMessages(formattedMessages);
      if (details.doc_ids && details.doc_ids.length > 0) {
        setSelectedDocIds(details.doc_ids);
      }
    } catch (err) {
      console.error("Failed to load session details:", err);
      setError("Failed to load chat history.");
    }
  };

  const handleNewChat = () => {
    const newId = `sess_${Math.random().toString(36).substring(7)}`;
    setSessionId(newId);
    setMessages([]);
    setActiveCitation(null);
    setError("");
    setMobileMenuOpen(false);
  };

  const handleDeleteSession = async (e, sessId) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this chat session?")) return;
    try {
      await deleteSession(sessId);
      if (sessId === sessionId) {
        const remaining = sessions.filter(s => s.session_id !== sessId);
        if (remaining.length > 0) {
          handleSelectSession(remaining[0].session_id);
          setSessions(remaining);
        } else {
          handleNewChat();
          setSessions([]);
        }
      } else {
        setSessions(prev => prev.filter(s => s.session_id !== sessId));
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
      if (activeCitation?.doc_name && documents.find(d => d.doc_id === docId)?.title === activeCitation.doc_name) {
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

  const pollSessionEvaluation = async (sessId, turnIndex) => {
    let attempts = 0;
    const maxAttempts = 6;
    
    const interval = setInterval(async () => {
      attempts++;
      try {
        const evals = await fetchSessionEvaluations(sessId);
        const turnEval = evals.find((e) => e.turn_index === turnIndex);
        if (turnEval && (turnEval.faithfulness !== null || turnEval.answer_relevancy !== null)) {
          setMessages((prev) => {
            const assistantIndex = 2 * turnIndex + 1;
            if (prev[assistantIndex] && prev[assistantIndex].role === "assistant") {
              return prev.map((msg, idx) => {
                if (idx === assistantIndex) {
                  return {
                    ...msg,
                    faithfulness: turnEval.faithfulness,
                    answer_relevancy: turnEval.answer_relevancy
                  };
                }
                return msg;
              });
            }
            return prev;
          });
          clearInterval(interval);
        }
      } catch (err) {
        console.error("Error polling evaluations:", err);
      }
      
      if (attempts >= maxAttempts) {
        clearInterval(interval);
      }
    }, 2500);
  };

  const handleSendMessage = async (queryText) => {
    if (!selectedDocIds || selectedDocIds.length === 0) {
      setError("Please select at least one document in your library to query.");
      return;
    }

    setError("");
    setIsStreaming(true);
    setCurrentStreamedAnswer("");
    setCurrentInfo(null);

    const activeTurnIndex = Math.floor(messages.length / 2);

    setMessages((prev) => [...prev, { role: "user", content: queryText }]);

    let accumulatedAnswer = "";
    let finalCitations = [];
    let finalInfo = null;

    await streamChatQuery({
      query: queryText,
      sessionId,
      userId: userId,
      docIds: selectedDocIds,
      useHyde,
      rerank,
      useHybrid,
      onToken: (token) => {
        accumulatedAnswer += token;
        setCurrentStreamedAnswer(accumulatedAnswer);
      },
      onInfo: (info) => {
        finalInfo = info;
        setCurrentInfo(info);
      },
      onCitations: (citations, info) => {
        finalCitations = citations;
        if (info) {
          finalInfo = info;
          setCurrentInfo(info);
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
        role: "assistant",
        content: accumulatedAnswer,
        citations: finalCitations,
        info: finalInfo
      }
    ]);
    setIsStreaming(false);
    setCurrentStreamedAnswer("");
    setCurrentInfo(null);

    pollSessionEvaluation(sessionId, activeTurnIndex);

    try {
      const data = await fetchSessions(userId);
      setSessions(data);
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
      setError("Failed to fetch platform analytics. Please ensure queries exist.");
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
    <div className="h-[100dvh] w-screen bg-[#070b13] text-slate-100 flex flex-col font-sans overflow-hidden">
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none pulse-glow-emerald"></div>
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-[100px] pointer-events-none"></div>

      <header className="flex-shrink-0 border-b border-slate-900 bg-[#070b13]/85 backdrop-blur-md z-50 px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-400 hover:text-white bg-slate-900/40 hover:bg-slate-900/80 rounded-xl border border-slate-850 transition active:scale-95 cursor-pointer"
            title="Toggle Menu"
          >
            <Menu className="w-4 h-4" />
          </button>

          <div className="p-2 bg-gradient-to-tr from-emerald-500 to-teal-500 rounded-lg shadow-lg border border-emerald-400/20">
            <Brain className="w-5 h-5 sm:w-6 sm:h-6 text-slate-950 font-bold" />
          </div>
          <div>
            <h1 className="text-sm sm:text-xl font-bold tracking-tight text-white flex items-center">
              DocuMind <span className="text-emerald-400 ml-1.5 text-[10px] sm:text-xs font-semibold px-2 py-0.5 bg-emerald-950/30 rounded-full border border-emerald-500/20">AI</span>
            </h1>
            <p className="text-[9px] sm:text-[10px] text-slate-500 hidden md:block">Multi-format RAG Q&A Engine</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-3.5">
          <button
            onClick={() => setMobileLibraryOpen(!mobileLibraryOpen)}
            className="lg:hidden p-2 text-slate-400 hover:text-emerald-400 bg-slate-900/40 hover:bg-slate-900/80 rounded-xl border border-slate-850 transition active:scale-95 cursor-pointer"
            title="Open Document Library"
          >
            <FolderOpen className="w-4 h-4" />
          </button>

          <button
            onClick={handleOpenAnalytics}
            className="hidden sm:flex text-xs font-medium text-slate-350 hover:text-white bg-emerald-950/10 hover:bg-emerald-950/20 border border-emerald-500/20 px-3.5 py-1.5 rounded-xl transition flex items-center space-x-1.5 cursor-pointer active:scale-95"
            title="Open platform analytics dashboard"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Analytics</span>
          </button>

          {user && (
            <div className="hidden md:flex items-center space-x-2 sm:space-x-3 bg-emerald-950/10 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-emerald-550/20">
              {user.picture ? (
                <img
                  src={user.picture}
                  alt="Avatar"
                  className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-emerald-500/20"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-600 flex items-center justify-center text-[10px] sm:text-xs font-bold text-white">
                  {user.name ? user.name[0] : "U"}
                </div>
              )}
              <div className="flex flex-col text-left hidden sm:flex">
                <span className="text-xs font-semibold text-slate-200 leading-none">{user.name}</span>
                <span className="text-[9px] text-slate-500 mt-0.5 max-w-[120px] truncate">{user.email}</span>
              </div>
              <button
                onClick={handleLogout}
                className="px-1.5 py-0.5 sm:px-2 sm:py-1 hover:bg-red-950/20 hover:text-red-400 border border-transparent hover:border-red-900/50 text-[9px] sm:text-[10px] font-medium text-slate-400 rounded-lg transition active:scale-95 cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          )}

          <span className="hidden xl:flex text-xs text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Active HF Space Backend</span>
          </span>
        </div>
      </header>

      {/* Main Content Area (Responsive Layout) */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        
        {mobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Sessions */}
        <aside className={`fixed inset-y-0 left-0 w-64 bg-[#090e18]/95 border-r border-slate-900 flex flex-col z-40 transition-transform duration-300 transform ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        } md:relative md:translate-x-0 md:flex flex-shrink-0`}>
          <div className="p-4 border-b border-slate-900 flex items-center justify-between gap-2">
            <button
              onClick={handleNewChat}
              className="flex-1 py-2.5 px-4 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-450 hover:text-emerald-300 border border-emerald-550/25 hover:border-emerald-400/50 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.05)] hover:shadow-[0_0_20px_rgba(16,185,129,0.18)] active:scale-95 cursor-pointer backdrop-blur-md"
            >
              <Plus className="w-4 h-4" />
              <span>New Conversation</span>
            </button>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden p-2 text-slate-400 hover:text-white bg-slate-900/40 hover:bg-slate-900/80 rounded-xl border border-slate-850 active:scale-95 transition"
              title="Close Menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
            {sessions.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-600 italic">
                No recent conversations
              </div>
            ) : (
              sessions.map((sess) => {
                const isActive = sess.session_id === sessionId;
                return (
                  <div
                    key={sess.session_id}
                    onClick={() => handleSelectSession(sess.session_id)}
                    className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer border transition duration-200 ${
                      isActive
                        ? "bg-emerald-950/15 border-emerald-5/25 text-white"
                        : "bg-transparent border-transparent text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 overflow-hidden flex-1">
                      <MessageSquare className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-emerald-450" : "text-slate-500"}`} />
                      <span className="text-xs truncate font-medium text-left">
                        {sess.title}
                      </span>
                    </div>
                    <button
                      onClick={(e) => handleDeleteSession(e, sess.session_id)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-950/30 rounded text-slate-500 hover:text-red-400 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-auto border-t border-slate-900 p-4 bg-[#080d16] flex flex-col space-y-3">
            <button
              onClick={handleOpenAnalytics}
              className="sm:hidden w-full text-xs font-semibold text-slate-350 hover:text-white bg-emerald-950/10 hover:bg-emerald-950/20 border border-emerald-550/20 px-3.5 py-2.5 rounded-xl transition flex items-center justify-center space-x-2 cursor-pointer active:scale-95"
            >
              <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>Analytics Dashboard</span>
            </button>

            {user && (
              <div className="md:hidden w-full flex items-center justify-between bg-emerald-950/5 p-3 rounded-xl border border-emerald-500/10">
                <div className="flex items-center space-x-2.5 min-w-0">
                  {user.picture ? (
                    <img
                      src={user.picture}
                      alt="Avatar"
                      className="w-8 h-8 rounded-full border border-emerald-500/20 flex-shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                      {user.name ? user.name[0] : "U"}
                    </div>
                  )}
                  <div className="flex flex-col text-left min-w-0">
                    <span className="text-xs font-semibold text-slate-200 leading-none truncate">{user.name}</span>
                    <span className="text-[10px] text-slate-500 mt-1 truncate">{user.email}</span>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-2.5 py-1.5 hover:bg-red-950/20 hover:text-red-400 border border-transparent hover:border-red-900/50 text-[10px] font-medium text-slate-400 rounded-lg transition active:scale-95 cursor-pointer ml-2 flex-shrink-0"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </aside>

        {mobileLibraryOpen && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
            onClick={() => setMobileLibraryOpen(false)}
          />
        )}

        {/* Docs */}
        <aside className={`fixed inset-y-0 right-0 w-80 max-w-[calc(100vw-3rem)] bg-[#070b13]/97 lg:bg-[#070b13]/95 border-l lg:border-l-0 lg:border-r border-slate-900 flex flex-col z-40 p-5 space-y-6 transition-transform duration-300 transform ${
          mobileLibraryOpen ? "translate-x-0" : "translate-x-full"
        } lg:relative lg:translate-x-0 lg:flex flex-shrink-0 overflow-hidden`}>
          <div className="flex items-center justify-between pb-1 border-b border-slate-900 lg:border-none lg:pb-0 flex-shrink-0">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Document Manager</h2>
            <button
              onClick={() => setMobileLibraryOpen(false)}
              className="lg:hidden p-1.5 text-slate-400 hover:text-white bg-slate-900/40 hover:bg-slate-900/80 rounded-lg border border-slate-850 active:scale-95 transition"
              title="Close Library"
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
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Document Library</h2>
              <span className="text-[10px] px-2.5 py-0.5 bg-emerald-950/20 text-emerald-400 rounded-full border border-emerald-500/20 font-semibold">
                {selectedDocIds.length} / {documents.length} selected
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

        {/* Chat */}
        <main className="flex-1 flex overflow-hidden relative">
          <div className="flex-1 flex flex-col h-full relative overflow-hidden">
            {error && (
              <div className="m-4 p-3 bg-red-950/20 border border-red-500/25 rounded-xl flex items-center space-x-2 text-red-400 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <Chat
              messages={messages}
              onSendMessage={handleSendMessage}
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
              currentInfo={currentInfo}
            />
          </div>

          {activeCitation && (
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-35 md:hidden"
              onClick={() => setActiveCitation(null)}
            />
          )}

          {/* Citation */}
          {activeCitation && (
            <div className="fixed inset-y-0 right-0 md:relative w-80 max-w-[calc(100vw-3rem)] border-l border-slate-900 bg-[#090e18]/97 md:bg-[#090e18]/95 p-5 flex flex-col justify-between shadow-2xl z-45 md:z-20 flex-shrink-0">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-slate-200">Source Passage</span>
                  </div>
                  <button
                    onClick={() => setActiveCitation(null)}
                    className="p-1 hover:bg-slate-800/80 rounded transition"
                  >
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                </div>

                <div className="text-left space-y-2">
                  <p className="text-xs font-medium text-slate-400 truncate">
                    Document: <span className="text-slate-200">{activeCitation.doc_name}</span>
                  </p>
                  <p className="text-xs font-medium text-slate-400">
                    Location: <span className="text-emerald-400 px-1.5 py-0.5 bg-emerald-950/40 rounded-md border border-emerald-500/20">Page {activeCitation.page}</span>
                  </p>
                </div>

                <div className="p-3.5 bg-slate-950/50 border border-slate-800 rounded-xl text-xs leading-relaxed text-slate-300 text-left max-h-[350px] overflow-y-auto italic">
                  "{activeCitation.text}"
                </div>
              </div>

              <div className="text-[10px] text-slate-500 text-left mt-4 border-t border-slate-800/80 pt-3">
                Verify this context mapping directly inside your uploaded document.
              </div>
            </div>
          )}
        </main>
        
      </div>

      {/* Analytics */}
      {showAnalytics && (
        <AnalyticsDashboard
          analytics={analyticsData}
          onClose={() => setShowAnalytics(false)}
        />
      )}
    </div>
  );
}
