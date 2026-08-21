const API_BASE_URL = import.meta.env.VITE_API_URL || "https://tusharpatel-documind.hf.space/api/v1";

/**
 * DocuMind AI API Client
 */

export async function fetchDocuments(userId) {
  const res = await fetch(`${API_BASE_URL}/documents?user_id=${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error("Failed to fetch documents.");
  return res.json();
}

export async function uploadDocument(file, userId) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("user_id", userId);

  const res = await fetch(`${API_BASE_URL}/documents/ingest`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || "Ingestion failed.");
  }
  return res.json();
}

export async function deleteDocument(docId, userId) {
  const res = await fetch(`${API_BASE_URL}/documents/${docId}?user_id=${encodeURIComponent(userId)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete document.");
  return res.json();
}

export async function transcribeAudio(audioBlob, language = "en") {
  const formData = new FormData();
  formData.append("file", audioBlob, "recording.webm");
  formData.append("language", language);

  const res = await fetch(`${API_BASE_URL}/voice/transcribe`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Voice transcription failed.");
  }
  return res.json();
}

export async function fetchSupportedModels() {
  try {
    const res = await fetch(`${API_BASE_URL}/voice/models`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function streamChatQuery({
  query,
  sessionId,
  userId,
  docIds,
  provider = "groq",
  model = null,
  useHyde = false,
  rerank = true,
  useHybrid = true,
  useParentChild = true,
  onToken,
  onCitations,
  onInspector,
  onDone,
  onError
}) {
  try {
    const response = await fetch(`${API_BASE_URL}/chat/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        session_id: sessionId,
        user_id: userId,
        doc_ids: docIds,
        provider,
        model,
        use_hyde: useHyde,
        rerank,
        use_hybrid: useHybrid,
        use_parent_child: useParentChild,
        top_k: 5
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || "Server streaming error.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split("\n\n");
      buffer = blocks.pop() || "";

      for (const block of blocks) {
        if (!block.trim()) continue;

        let eventType = "message";
        let dataStr = "";

        const lines = block.split("\n");
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            dataStr = line.slice(6).trim();
          }
        }

        if (!dataStr) continue;

        try {
          const parsed = JSON.parse(dataStr);
          if (eventType === "delta") {
            if (onToken) onToken(parsed.text || "");
          } else if (eventType === "citations") {
            if (onCitations) onCitations(parsed.citations || [], parsed);
          } else if (eventType === "inspector") {
            if (onInspector) onInspector(parsed);
          } else if (eventType === "done") {
            if (onDone) onDone(parsed);
          } else if (eventType === "error") {
            if (onError) onError(parsed.error || "Generation error");
          }
        } catch (e) {
          // Fallback simple token format
          if (onToken && dataStr) onToken(dataStr);
        }
      }
    }
  } catch (err) {
    console.error("Stream reader error:", err);
    if (onError) onError(err.message || "Connection lost.");
  }
}

export async function fetchSessions(userId) {
  const res = await fetch(`${API_BASE_URL}/chat/sessions?user_id=${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error("Failed to fetch sessions.");
  return res.json();
}

export async function fetchSessionDetails(sessionId) {
  const res = await fetch(`${API_BASE_URL}/chat/sessions/${encodeURIComponent(sessionId)}`);
  if (!res.ok) throw new Error("Failed to fetch session details.");
  return res.json();
}

export async function deleteSession(sessionId) {
  const res = await fetch(`${API_BASE_URL}/chat/sessions/${encodeURIComponent(sessionId)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete session.");
  return res.json();
}

export async function fetchSessionEvaluations(sessionId) {
  const res = await fetch(`${API_BASE_URL}/chat/sessions/${encodeURIComponent(sessionId)}/eval`);
  if (!res.ok) throw new Error("Failed to fetch session evaluations.");
  return res.json();
}

export async function fetchUserAnalytics(userId) {
  const res = await fetch(`${API_BASE_URL}/chat/analytics?user_id=${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error("Failed to fetch user analytics.");
  return res.json();
}
