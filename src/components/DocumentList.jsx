import React from "react";
import { FileText, FileCode, Image as ImageIcon, Trash2, CheckCircle } from "lucide-react";

export default function DocumentList({ documents, selectedDocIds, onToggleSelect, onDelete, isDeleting }) {
  const getIcon = (type) => {
    const t = type.toLowerCase();
    if (t === "pdf") {
      return (
        <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-450 shadow-[0_0_12px_rgba(244,63,94,0.06)]">
          <FileText className="w-4 h-4" />
        </div>
      );
    }
    if (t === "docx" || t === "doc") {
      return (
        <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.06)]">
          <FileText className="w-4 h-4" />
        </div>
      );
    }
    if (t === "txt" || t === "md") {
      return (
        <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-450 shadow-[0_0_12px_rgba(16,185,129,0.06)]">
          <FileCode className="w-4 h-4" />
        </div>
      );
    }
    if (["png", "jpg", "jpeg", "tiff", "bmp"].includes(t)) {
      return (
        <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.06)]">
          <ImageIcon className="w-4 h-4" />
        </div>
      );
    }
    return (
      <div className="p-2 bg-slate-500/10 border border-slate-500/20 rounded-xl text-slate-400">
        <FileText className="w-4 h-4" />
      </div>
    );
  };

  if (documents.length === 0) {
    return (
      <div className="text-center py-10 bg-slate-950/15 border border-slate-900 rounded-2xl p-6 text-slate-500 text-xs italic">
        No documents uploaded yet.
      </div>
    );
  }

  return (
    <div className="space-y-2.5 mt-4 max-h-[360px] overflow-y-auto px-1.5 py-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
      {documents.map((doc) => {
        const isSelected = selectedDocIds.includes(doc.doc_id);
        const isIndexing = doc.status === "processing";
        const isError = doc.status === "error";

        return (
          <div
            key={doc.doc_id}
            className={`p-3 rounded-xl flex items-center justify-between cursor-pointer transition-all duration-300 relative overflow-hidden group/doc ${
              isSelected
                ? "border border-emerald-500/30 bg-emerald-950/10 shadow-[0_0_15px_rgba(16,185,129,0.04)] scale-[1.01]"
                : "border border-slate-900 bg-slate-950/25 hover:bg-slate-950/45 hover:border-slate-800 hover:scale-[1.01]"
            }`}
            onClick={() => {
              if (!isIndexing && !isError) onToggleSelect(doc.doc_id);
            }}
          >
            <div className="flex items-center space-x-3.5 truncate mr-2 flex-1">
              <div className="flex-shrink-0 transition-transform duration-300 group-hover/doc:scale-105">
                {getIcon(doc.file_type)}
              </div>
              <div className="truncate text-left">
                <p className="text-xs font-semibold text-slate-200 truncate group-hover/doc:text-white transition-colors duration-200" title={doc.title}>
                  {doc.title}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {isIndexing ? (
                    <span className="text-yellow-500/80 animate-pulse flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-ping"></span>
                      Indexing...
                    </span>
                  ) : isError ? (
                    <span className="text-red-400/80">Failed processing</span>
                  ) : (
                    `${doc.page_count} pages • ${doc.chunk_count} chunks`
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
              {isSelected && (
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 filter drop-shadow-[0_0_6px_rgba(16,185,129,0.3)]" />
              )}
              <button
                disabled={isDeleting}
                onClick={() => onDelete(doc.doc_id)}
                className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/25 rounded-lg transition-all duration-300 flex-shrink-0 disabled:opacity-50"
                title="Delete document"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
