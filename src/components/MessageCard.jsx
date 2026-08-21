import React, { memo } from "react";
import { Activity, Volume2, VolumeX, Copy, Check, ExternalLink } from "lucide-react";

/**
 * Tokenizes and renders inline markdown elements:
 * - Bold: **text** or __text__
 * - Italic: *text* or _text_
 * - Code: `code`
 * - Links: [label](url)
 * - Citations: [SOURCE:chunk_id]
 */
function renderInlineTokens(text, citations, onCitationClick, keyPrefix) {
  if (!text) return null;

  // 1. First split by Citation tags: [SOURCE:id]
  const citationRegex = /\[SOURCE:\s*([a-zA-Z0-9_\-]+)\s*\]/gi;
  const citationParts = [];
  let lastIndex = 0;
  let match;

  while ((match = citationRegex.exec(text)) !== null) {
    const matchStart = match.index;
    const chunkId = match[1];

    if (matchStart > lastIndex) {
      citationParts.push({ type: "text", content: text.substring(lastIndex, matchStart) });
    }

    const citeIndex = citations.findIndex(
      (c) => c.chunk_id?.toLowerCase() === chunkId.trim().toLowerCase()
    );

    if (citeIndex !== -1) {
      citationParts.push({
        type: "citation",
        citation: citations[citeIndex],
        index: citeIndex + 1
      });
    } else {
      citationParts.push({ type: "missing_citation" });
    }

    lastIndex = citationRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    citationParts.push({ type: "text", content: text.substring(lastIndex) });
  }

  // 2. Parse inline styles (bold, links, code) for text segments
  return citationParts.map((part, pIdx) => {
    if (part.type === "citation") {
      return (
        <button
          key={`${keyPrefix}-cite-${pIdx}`}
          onClick={() => onCitationClick(part.citation)}
          className="inline-flex items-center justify-center px-1.5 py-0.5 mx-0.5 text-[10px] font-bold bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-md cursor-pointer transition-all duration-150 align-super"
          title={`${part.citation.doc_name} (Page ${part.citation.page})`}
        >
          [{part.index}]
        </button>
      );
    }
    if (part.type === "missing_citation") {
      return (
        <span key={`${keyPrefix}-miss-${pIdx}`} className="text-slate-500 text-[10px] mx-0.5 align-super select-none">
          [*]
        </span>
      );
    }

    const rawStr = part.content;

    // Split for code spans `code`, bold **text**, and links [text](url)
    const tokenRegex = /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g;
    const tokens = rawStr.split(tokenRegex);

    return tokens.map((token, tIdx) => {
      if (!token) return null;

      // Inline code `code`
      if (token.startsWith("`") && token.endsWith("`") && token.length > 2) {
        return (
          <code
            key={`${keyPrefix}-c-${pIdx}-${tIdx}`}
            className="px-1.5 py-0.5 mx-0.5 rounded bg-slate-900 border border-white/10 text-emerald-300 font-mono text-xs"
          >
            {token.slice(1, -1)}
          </code>
        );
      }

      // Bold **text** or __text__
      if ((token.startsWith("**") && token.endsWith("**") && token.length > 4) ||
          (token.startsWith("__") && token.endsWith("__") && token.length > 4)) {
        const inner = token.slice(2, -2);
        return (
          <strong key={`${keyPrefix}-b-${pIdx}-${tIdx}`} className="font-bold text-white">
            {inner}
          </strong>
        );
      }

      // Markdown Link [text](url)
      const linkMatch = token.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
      if (linkMatch) {
        return (
          <a
            key={`${keyPrefix}-a-${pIdx}-${tIdx}`}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:text-emerald-300 underline inline-flex items-center space-x-0.5"
          >
            <span>{linkMatch[1]}</span>
            <ExternalLink className="w-2.5 h-2.5 ml-0.5 inline" />
          </a>
        );
      }

      return <span key={`${keyPrefix}-t-${pIdx}-${tIdx}`}>{token}</span>;
    });
  });
}

/**
 * Parses full multiline Markdown body into clean JSX elements
 */
function MarkdownRenderer({ content, citations, onCitationClick }) {
  if (!content) return null;

  const lines = content.split("\n");
  const elements = [];
  let inCodeBlock = false;
  let codeBuffer = [];
  let inTable = false;
  let tableRows = [];

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    // 1. Code Block Fence ```
    if (trimmed.startsWith("```")) {
      if (inCodeBlock) {
        // End code block
        elements.push(
          <div key={`code-${idx}`} className="my-2.5 p-3 rounded-xl bg-slate-950 border border-white/10 text-xs font-mono text-emerald-300 overflow-x-auto">
            <pre>{codeBuffer.join("\n")}</pre>
          </div>
        );
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      return;
    }

    // 2. Table Row | col1 | col2 |
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      // Ignore separator row |--|--|
      if (!/^\|[\s\-:|]+\|$/.test(trimmed)) {
        const cells = trimmed
          .slice(1, -1)
          .split("|")
          .map((c) => c.trim());
        tableRows.push(cells);
      }
      inTable = true;
      return;
    } else if (inTable) {
      // Flush table
      if (tableRows.length > 0) {
        const [headerRow, ...bodyRows] = tableRows;
        elements.push(
          <div key={`table-${idx}`} className="my-3 overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse border border-white/10 rounded-xl overflow-hidden">
              <thead className="bg-slate-900/80 text-emerald-400">
                <tr>
                  {headerRow.map((h, hIdx) => (
                    <th key={hIdx} className="p-2.5 border border-white/10 font-bold">
                      {renderInlineTokens(h, citations, onCitationClick, `th-${idx}-${hIdx}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 bg-[#080d15]/60">
                {bodyRows.map((r, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-900/40">
                    {r.map((c, cIdx) => (
                      <td key={cIdx} className="p-2.5 border border-white/10 text-slate-200">
                        {renderInlineTokens(c, citations, onCitationClick, `td-${idx}-${rIdx}-${cIdx}`)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        tableRows = [];
      }
      inTable = false;
    }

    // 3. Headings (#, ##, ###, ####)
    const headingMatch = trimmed.match(/^(#{1,6})\s*(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      let rawTitle = headingMatch[2].trim();
      // Strip outer ** from heading text if present
      if (rawTitle.startsWith("**") && rawTitle.endsWith("**") && rawTitle.length > 4) {
        rawTitle = rawTitle.slice(2, -2);
      }

      if (level === 1) {
        elements.push(
          <h1 key={`h1-${idx}`} className="text-lg font-extrabold text-white mt-4 mb-2 pb-1 border-b border-emerald-500/30">
            {renderInlineTokens(rawTitle, citations, onCitationClick, `h1-${idx}`)}
          </h1>
        );
      } else if (level === 2) {
        elements.push(
          <h2 key={`h2-${idx}`} className="text-base font-bold text-white mt-3.5 mb-1.5 pb-1 border-b border-white/[0.08]">
            {renderInlineTokens(rawTitle, citations, onCitationClick, `h2-${idx}`)}
          </h2>
        );
      } else {
        elements.push(
          <h3 key={`h3-${idx}`} className="text-sm font-bold text-emerald-400 mt-3 mb-1 flex items-center space-x-2">
            <span>{renderInlineTokens(rawTitle, citations, onCitationClick, `h3-${idx}`)}</span>
          </h3>
        );
      }
      return;
    }

    // 4. Horizontal Dividers
    if (/^(\-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      elements.push(<hr key={`hr-${idx}`} className="border-t border-white/[0.08] my-3" />);
      return;
    }

    // 5. Bullet List Items (*, -, +, •) or Numbered Lists (1., 2.)
    const listMatch = trimmed.match(/^(\*|\-|\+|\•|\d+\.)\s+(.*)$/);
    if (listMatch) {
      const itemContent = listMatch[2];
      elements.push(
        <div key={`li-${idx}`} className="flex items-start space-x-2 my-1 text-slate-200 pl-1 text-sm leading-relaxed">
          <span className="text-emerald-400 font-bold select-none leading-tight mt-0.5">•</span>
          <div className="flex-1">
            {renderInlineTokens(itemContent, citations, onCitationClick, `li-${idx}`)}
          </div>
        </div>
      );
      return;
    }

    // 6. Empty Line
    if (!trimmed) {
      elements.push(<div key={`sp-${idx}`} className="h-1.5" />);
      return;
    }

    // 7. Regular Paragraph
    elements.push(
      <p key={`p-${idx}`} className="text-sm text-slate-200 leading-relaxed my-1">
        {renderInlineTokens(line, citations, onCitationClick, `p-${idx}`)}
      </p>
    );
  });

  return <div className="space-y-0.5 text-left">{elements}</div>;
}

/**
 * Memoized Message Card to prevent re-rendering when typing in the input box
 */
const MessageCard = memo(function MessageCard({
  msg,
  index,
  isSpeaking,
  isCopied,
  onInspect,
  onReadAloud,
  onCopy,
  onCitationClick
}) {
  const isUser = msg.type === "user" || msg.role === "user";

  return (
    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
      <div
        className={`max-w-3xl rounded-2xl p-4 shadow-lg transition-all ${
          isUser
            ? "bg-slate-900 border border-emerald-500/30 text-white rounded-br-none"
            : "bg-[#0a0f18] border border-white/[0.08] text-slate-200 rounded-bl-none w-full"
        }`}
      >
        {/* Assistant Header Toolbar */}
        {!isUser && (
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/[0.08] text-[11px] font-mono text-slate-400">
            <div className="flex items-center space-x-2">
              <span className="text-emerald-400 font-bold tracking-wider">
                DOCUMIND AI
              </span>
              {msg.cache_hit && (
                <span className="text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/30">
                  ⚡ CACHE HIT (&lt;15ms)
                </span>
              )}
            </div>

            <div className="flex items-center space-x-1.5">
              {/* RAG Inspector Button */}
              {msg.rag_inspector && (
                <button
                  onClick={() => onInspect(msg.rag_inspector)}
                  className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 flex items-center space-x-1 transition-colors cursor-pointer"
                  title="Open RAG Pipeline Inspector"
                >
                  <Activity className="w-3 h-3" />
                  <span>Inspect</span>
                </button>
              )}

              {/* TTS Read Aloud */}
              <button
                onClick={() => onReadAloud(msg.content, index)}
                className={`p-1 rounded-lg hover:bg-slate-800 transition-colors ${
                  isSpeaking ? "text-emerald-400 animate-pulse" : "text-slate-400 hover:text-slate-200"
                }`}
                title="Read aloud"
              >
                {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>

              {/* Copy */}
              <button
                onClick={() => onCopy(msg.content, index)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
                title="Copy text"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        )}

        {/* Message Content */}
        {isUser ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-100">{msg.content}</p>
        ) : (
          <MarkdownRenderer
            content={msg.content}
            citations={msg.citations || []}
            onCitationClick={onCitationClick}
          />
        )}
      </div>
    </div>
  );
});

export default MessageCard;
