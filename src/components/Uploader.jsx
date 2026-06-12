import React, { useRef, useState } from "react";
import { Upload, AlertCircle, Loader2 } from "lucide-react";

export default function Uploader({ onUploadComplete, isUploading, setIsUploading }) {
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState("");

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateAndUpload = async (file) => {
    if (!file) return;
    
    const allowedExtensions = ["pdf", "docx", "doc", "txt", "md", "png", "jpg", "jpeg", "tiff", "bmp"];
    const ext = file.name.split(".").pop().toLowerCase();
    
    if (!allowedExtensions.includes(ext)) {
      setError(`Format .${ext} not supported. Use PDF, Word, plain text, or images.`);
      return;
    }

    setError("");
    setIsUploading(true);

    try {
      await onUploadComplete(file);
    } catch (err) {
      setError(err.message || "Failed to upload document.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndUpload(e.target.files[0]);
    }
  };

  const triggerInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full group/uploader">
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={triggerInput}
        className={`w-full p-6 border border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 backdrop-blur-md relative overflow-hidden ${
          dragActive
            ? "border-emerald-450 bg-emerald-950/20 scale-[0.98] shadow-[0_0_15px_rgba(16,185,129,0.08)]"
            : "border-slate-800 hover:border-emerald-500/25 bg-slate-950/20 hover:bg-slate-950/40"
        } ${isUploading ? "pointer-events-none opacity-80" : ""}`}
      >
        {/* Glow background on hover */}
        <div className="absolute -inset-x-20 -inset-y-20 bg-emerald-500/5 rounded-full blur-2xl opacity-0 group-hover/uploader:opacity-100 transition-opacity duration-500 pointer-events-none" />

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleChange}
          accept=".pdf,.docx,.doc,.txt,.md,.png,.jpg,.jpeg,.tiff,.bmp"
          disabled={isUploading}
        />

        {isUploading ? (
          <div className="flex flex-col items-center space-y-3 relative z-10">
            <div className="p-3 bg-emerald-950/15 border border-emerald-500/20 rounded-xl animate-pulse">
              <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold text-slate-200">Processing file...</p>
              <p className="text-[10px] text-slate-500 mt-1">Parsing content and embedding vectors</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-3 relative z-10">
            <div className="p-3.5 bg-emerald-950/10 border border-emerald-500/15 rounded-xl text-emerald-400 group-hover/uploader:scale-105 group-hover/uploader:border-emerald-500/30 group-hover/uploader:bg-emerald-950/20 transition-all duration-300">
              <Upload className="w-5 h-5" />
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold text-slate-350 group-hover/uploader:text-slate-200 transition-colors duration-300">
                Drag & drop or <span className="text-emerald-400 underline decoration-emerald-500/40 hover:decoration-emerald-400 transition-colors">browse</span>
              </p>
              <p className="text-[10px] text-slate-500 mt-1">
                Supports PDF, DOCX, TXT, MD, and Images
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-3 p-3 bg-red-950/20 border border-red-500/20 rounded-xl flex items-start space-x-2 text-red-400 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
