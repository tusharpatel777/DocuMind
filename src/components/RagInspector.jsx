import React, { useState } from "react";
import { 
  Activity, 
  X, 
  Layers, 
  Zap, 
  Database, 
  Cpu, 
  Sparkles, 
  CheckCircle2, 
  Maximize2, 
  Minimize2, 
  ChevronRight, 
  Info,
  Clock,
  Search
} from "lucide-react";

export default function RagInspector({ isOpen, onClose, inspectorData }) {
  const [selectedChunk, setSelectedChunk] = useState(null);
  const [showParentText, setShowParentText] = useState(true);

  if (!isOpen || !inspectorData) return null;

  const chunks = inspectorData.candidate_chunks || [];
  const activeChunk = selectedChunk || chunks[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-5xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 right-1/4 w-96 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60 backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-semibold text-white">RAG Pipeline Inspector</h3>
                <span className="px-2 py-0.5 text-[10px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-md">
                  {inspectorData.provider?.toUpperCase()} • {inspectorData.model}
                </span>
                {inspectorData.cache_hit && (
                  <span className="px-2 py-0.5 text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-md flex items-center space-x-1">
                    <Zap className="w-3 h-3" />
                    <span>CACHE HIT (&lt;15ms)</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xl">
                Query: <span className="text-slate-200">"{inspectorData.query}"</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-3.5 bg-slate-950/40 border-b border-slate-800">
          <div className="p-3 bg-slate-900/80 border border-slate-800/80 rounded-xl">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Retrieval Latency</span>
              <Database className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="text-lg font-bold text-white font-mono">
              {inspectorData.retrieval_latency_ms || 0} <span className="text-xs font-normal text-slate-400">ms</span>
            </div>
          </div>

          <div className="p-3 bg-slate-900/80 border border-slate-800/80 rounded-xl">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Generation Latency</span>
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-lg font-bold text-white font-mono">
              {inspectorData.generation_latency_ms || 0} <span className="text-xs font-normal text-slate-400">ms</span>
            </div>
          </div>

          <div className="p-3 bg-slate-900/80 border border-slate-800/80 rounded-xl">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Candidate Fusion</span>
              <Layers className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-sm font-semibold text-white font-mono mt-0.5">
              {inspectorData.dense_retrieval_count} <span className="text-[10px] text-slate-400 font-normal">Dense</span> + {inspectorData.sparse_retrieval_count} <span className="text-[10px] text-slate-400 font-normal">BM25</span>
            </div>
          </div>

          <div className="p-3 bg-slate-900/80 border border-slate-800/80 rounded-xl">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>RRF & Rerank Final</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <div className="text-lg font-bold text-sky-400 font-mono">
              {chunks.length} <span className="text-xs font-normal text-slate-400">Chunks</span>
            </div>
          </div>
        </div>

        {/* Content Body: Left Candidates List + Right Detail Viewer */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 min-h-0 divide-y md:divide-y-0 md:divide-x divide-slate-800 overflow-hidden">
          {/* Candidates List */}
          <div className="md:col-span-5 flex flex-col min-h-0 bg-slate-950/20">
            <div className="px-4 py-2.5 bg-slate-900/50 border-b border-slate-800/80 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
              <span>Retrieved Chunks (Ranked)</span>
              <span className="text-[10px] text-slate-500 font-normal">RRF k=60 & Cross-Encoder</span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {chunks.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  No candidate chunks found.
                </div>
              ) : (
                chunks.map((chunk, idx) => {
                  const isSelected = activeChunk?.chunk_id === chunk.chunk_id;
                  return (
                    <div
                      key={chunk.chunk_id || idx}
                      onClick={() => setSelectedChunk(chunk)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-indigo-600/10 border-indigo-500/40 shadow-sm"
                          : "bg-slate-900/60 border-slate-800/60 hover:bg-slate-850 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center space-x-2">
                          <span className="w-5 h-5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-bold flex items-center justify-center font-mono">
                            #{idx + 1}
                          </span>
                          <span className="text-xs font-medium text-slate-200 truncate max-w-[140px]">
                            {chunk.doc_name}
                          </span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                          p. {chunk.page}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {chunk.text}
                      </p>

                      <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono text-slate-400">
                        {chunk.rerank_score !== undefined && chunk.rerank_score !== null && (
                          <span className="text-emerald-400">
                            ReRank: {chunk.rerank_score}
                          </span>
                        )}
                        {chunk.rrf_score !== undefined && chunk.rrf_score !== null && (
                          <span className="text-indigo-400">
                            RRF: {chunk.rrf_score}
                          </span>
                        )}
                        {chunk.is_parent_expanded && (
                          <span className="text-amber-400 bg-amber-500/10 px-1 rounded">
                            Small-to-Big ✓
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Detailed Inspector Panel */}
          <div className="md:col-span-7 flex flex-col min-h-0 bg-slate-900/30">
            {activeChunk ? (
              <div className="flex-1 flex flex-col min-h-0 p-5 overflow-y-auto space-y-4">
                {/* Chunk Meta Banner */}
                <div className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Chunk Identifier:
                    </span>
                    <p className="text-xs font-mono text-indigo-300 truncate max-w-sm">
                      {activeChunk.chunk_id}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Source Page:
                    </span>
                    <p className="text-xs font-mono text-slate-200">
                      Page {activeChunk.page}
                    </p>
                  </div>
                </div>

                {/* Algorithmic Scoring Breakdown */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-300">
                    Retrieval & Ranking Mathematics:
                  </span>
                  <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                    <div className="p-2.5 bg-slate-950/40 border border-slate-800/80 rounded-lg">
                      <span className="text-[10px] text-slate-500 block">Cross-Encoder</span>
                      <span className="text-emerald-400 font-bold">
                        {activeChunk.rerank_score ?? "N/A"}
                      </span>
                    </div>
                    <div className="p-2.5 bg-slate-950/40 border border-slate-800/80 rounded-lg">
                      <span className="text-[10px] text-slate-500 block">RRF Score (k=60)</span>
                      <span className="text-indigo-400 font-bold">
                        {activeChunk.rrf_score ?? "N/A"}
                      </span>
                    </div>
                    <div className="p-2.5 bg-slate-950/40 border border-slate-800/80 rounded-lg">
                      <span className="text-[10px] text-slate-500 block">Parent Context</span>
                      <span className="text-amber-400 font-bold">
                        {activeChunk.is_parent_expanded ? "Hydrated" : "Leaf Only"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Text Content */}
                <div className="space-y-2 flex-1 flex flex-col min-h-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300">
                      Passage Context (Fed to LLM):
                    </span>
                    {activeChunk.is_parent_expanded && (
                      <span className="text-[10px] text-amber-400 font-mono">
                        Small-to-Big Parent Context Window
                      </span>
                    )}
                  </div>
                  <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-300 leading-relaxed overflow-y-auto whitespace-pre-wrap font-sans">
                    {activeChunk.text}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
                Select a chunk on the left to inspect its retrieval parameters.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
