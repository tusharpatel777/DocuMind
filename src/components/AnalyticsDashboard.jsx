import React from "react";
import { X, Sparkles, Activity, ShieldCheck, Cpu, Database } from "lucide-react";

export default function AnalyticsDashboard({ analytics, onClose }) {
  if (!analytics) return null;

  const {
    document_count = 0,
    session_count = 0,
    total_queries = 0,
    avg_latency_ms = 0,
    avg_faithfulness = null,
    avg_relevancy = null,
    latency_history = []
  } = analytics;

  const formatPercent = (val) => {
    if (val === null || val === undefined) return "N/A";
    return `${Math.round(val * 100)}%`;
  };

  const getRagasScoreColor = (val) => {
    if (val === null || val === undefined) return "stroke-slate-800 text-slate-500";
    if (val >= 0.8) return "stroke-emerald-500 text-emerald-400";
    if (val >= 0.5) return "stroke-amber-500 text-amber-400";
    return "stroke-red-500 text-red-400";
  };

  // Circular gauge calculations
  const radius = 35;
  const strokeWidth = 6;
  const circumference = 2 * Math.PI * radius;

  const getStrokeDashoffset = (val) => {
    if (val === null || val === undefined) return circumference;
    return circumference - val * circumference;
  };

  // SVG Line Chart coordinates helper
  const renderLatencyChart = () => {
    if (!latency_history || latency_history.length === 0) {
      return (
        <div className="h-40 flex items-center justify-center text-xs text-slate-500 italic border border-slate-900 bg-slate-950/20 rounded-xl">
          Submit queries to visualize latency trends
        </div>
      );
    }

    const width = 450;
    const height = 150;
    const padding = 30;

    const maxVal = Math.max(...latency_history.map(d => d.latency), 1000);
    const minVal = 0;
    const valRange = maxVal - minVal;

    const points = latency_history.map((d, index) => {
      const x = padding + (index * (width - 2 * padding)) / Math.max(latency_history.length - 1, 1);
      const y = height - padding - ((d.latency - minVal) * (height - 2 * padding)) / valRange;
      return { x, y, val: d.latency, query: d.query };
    });

    const pathData = points.reduce((acc, p, i) => {
      return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
    }, "");

    const areaData = points.length > 0 
      ? `${pathData} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`
      : "";

    return (
      <div className="w-full bg-slate-950/45 p-4 rounded-xl border border-slate-900">
        <h4 className="text-xs font-semibold text-slate-400 mb-3 flex items-center space-x-1.5">
          <Activity className="w-3.5 h-3.5 text-violet-400" />
          <span>Latency History Trend (ms)</span>
        </h4>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible">
          <defs>
            <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="line-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#1e293b" strokeWidth="1" />
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#1e293b" strokeDasharray="3,3" strokeWidth="1" />
          <line x1={padding} y1={(height) / 2} x2={width - padding} y2={(height) / 2} stroke="#1e293b" strokeDasharray="3,3" strokeWidth="1" />

          {/* Left Y Axis Labels */}
          <text x={padding - 5} y={padding + 4} fill="#64748b" fontSize="8" textAnchor="end">{Math.round(maxVal)}ms</text>
          <text x={padding - 5} y={(height) / 2 + 3} fill="#64748b" fontSize="8" textAnchor="end">{Math.round(maxVal / 2)}ms</text>
          <text x={padding - 5} y={height - padding + 3} fill="#64748b" fontSize="8" textAnchor="end">0ms</text>

          {/* Filled Area */}
          {areaData && <path d={areaData} fill="url(#area-grad)" />}

          {/* Line */}
          {pathData && <path d={pathData} fill="none" stroke="url(#line-grad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}

          {/* Data Points */}
          {points.map((p, idx) => (
            <g key={idx} className="group/dot cursor-pointer">
              <circle cx={p.x} cy={p.y} r="4" fill="#ffffff" stroke="#8b5cf6" strokeWidth="2" />
              <circle cx={p.x} cy={p.y} r="8" fill="#8b5cf6" opacity="0" className="hover:opacity-20 transition-opacity" />
              
              {/* Tooltip on hover */}
              <title>{`${p.query}\nLatency: ${p.val}ms`}</title>
            </g>
          ))}
          
          {/* X Axis Labels */}
          {points.map((p, idx) => (
            <text key={idx} x={p.x} y={height - padding + 15} fill="#64748b" fontSize="7" textAnchor="middle" className="truncate max-w-[40px]">
              {`Q${idx + 1}`}
            </text>
          ))}
        </svg>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#02050b]/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#090e18]/90 border border-slate-850 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden relative">
        {/* Glow decorative rings */}
        <div className="absolute -top-20 -right-20 w-44 h-44 bg-violet-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-20 -left-20 w-44 h-44 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-900 z-10">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-violet-400 animate-pulse" />
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center">
                System Analytics
              </h3>
              <p className="text-[10px] text-slate-500">Live operational & retrieval telemetry</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 bg-slate-900/50 hover:bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 z-10 scrollbar-thin scrollbar-thumb-slate-800">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-950/30 border border-slate-900 p-4 rounded-xl flex items-center space-x-3.5">
              <div className="p-2 bg-violet-950/20 rounded-lg border border-violet-500/20 text-violet-400">
                <Database className="w-4 h-4" />
              </div>
              <div className="text-left">
                <span className="text-[10px] text-slate-500 block uppercase font-semibold">Documents</span>
                <span className="text-lg font-bold text-slate-200">{document_count}</span>
              </div>
            </div>

            <div className="bg-slate-950/30 border border-slate-900 p-4 rounded-xl flex items-center space-x-3.5">
              <div className="p-2 bg-indigo-950/20 rounded-lg border border-indigo-500/20 text-indigo-400">
                <Cpu className="w-4 h-4" />
              </div>
              <div className="text-left">
                <span className="text-[10px] text-slate-500 block uppercase font-semibold">Avg Latency</span>
                <span className="text-lg font-bold text-slate-200">{avg_latency_ms ? `${(avg_latency_ms / 1000).toFixed(2)}s` : "0s"}</span>
              </div>
            </div>

            <div className="bg-slate-950/30 border border-slate-900 p-4 rounded-xl flex items-center space-x-3.5">
              <div className="p-2 bg-emerald-950/20 rounded-lg border border-emerald-500/20 text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="text-left">
                <span className="text-[10px] text-slate-500 block uppercase font-semibold">Total Queries</span>
                <span className="text-lg font-bold text-slate-200">{total_queries}</span>
              </div>
            </div>

            <div className="bg-slate-950/30 border border-slate-900 p-4 rounded-xl flex items-center space-x-3.5">
              <div className="p-2 bg-blue-950/20 rounded-lg border border-blue-500/20 text-blue-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="text-left">
                <span className="text-[10px] text-slate-500 block uppercase font-semibold">Sessions</span>
                <span className="text-lg font-bold text-slate-200">{session_count}</span>
              </div>
            </div>
          </div>

          {/* RAGAS Accuracy Rings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-950/30 border border-slate-900 p-5 rounded-xl flex items-center justify-between">
              <div className="text-left max-w-[65%]">
                <div className="flex items-center space-x-1.5 mb-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-bold text-slate-300">RAGAS Faithfulness</h4>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Evaluates if all claims made in the generated answer are strictly grounded in the retrieved source contexts.
                </p>
              </div>
              <div className="relative flex items-center justify-center">
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle cx="40" cy="40" r={radius} stroke="#1e293b" strokeWidth={strokeWidth} fill="transparent" />
                  <circle
                    cx="40"
                    cy="40"
                    r={radius}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={getStrokeDashoffset(avg_faithfulness)}
                    className={`transition-all duration-1000 ease-out ${getRagasScoreColor(avg_faithfulness)}`}
                  />
                </svg>
                <span className="absolute text-xs font-bold text-slate-200">{formatPercent(avg_faithfulness)}</span>
              </div>
            </div>

            <div className="bg-slate-950/30 border border-slate-900 p-5 rounded-xl flex items-center justify-between">
              <div className="text-left max-w-[65%]">
                <div className="flex items-center space-x-1.5 mb-1">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                  <h4 className="text-xs font-bold text-slate-300">RAGAS Relevancy</h4>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Measures the similarity of the generated response to the original query intent, checking for redundancy.
                </p>
              </div>
              <div className="relative flex items-center justify-center">
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle cx="40" cy="40" r={radius} stroke="#1e293b" strokeWidth={strokeWidth} fill="transparent" />
                  <circle
                    cx="40"
                    cy="40"
                    r={radius}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={getStrokeDashoffset(avg_relevancy)}
                    className={`transition-all duration-1000 ease-out ${getRagasScoreColor(avg_relevancy)}`}
                  />
                </svg>
                <span className="absolute text-xs font-bold text-slate-200">{formatPercent(avg_relevancy)}</span>
              </div>
            </div>
          </div>

          {/* Latency History Chart */}
          {renderLatencyChart()}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-900 bg-slate-950/30 flex justify-end z-10">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-medium transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
