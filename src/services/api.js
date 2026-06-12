const API_BASE_URL = import.meta.env.VITE_API_URL || "https://tusharpatel-documind.hf.space/api/v1";

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

export async function streamChatQuery({
  query,
  sessionId,
  userId,
  docIds,
  useHyde = false,
  rerank = false,
  useHybrid = true,
  onToken,
  onCitations,
  onInfo,
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
        use_hyde: useHyde,
        rerank: rerank,
        use_hybrid: useHybrid,
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
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const cleaned = line.trim();
        if (!cleaned.startsWith("data: ")) continue;
        const rawData = cleaned.slice(6).trim();

        if (rawData === "[DONE]") {
          continue;
        }

        try {
          const parsed = JSON.parse(rawData);
          if (parsed.type === "token") {
            onToken(parsed.content);
          } else if (parsed.type === "info" || parsed.type === "info_status") {
            if (onInfo) onInfo(parsed);
          } else if (parsed.type === "citations") {
            onCitations(parsed.sources, parsed.info);
          } else if (parsed.type === "error") {
            onError(parsed.content);
          }
        } catch (e) {
          console.error("Failed to parse SSE line:", cleaned, e);
        }
      }
    }
  } catch (err) {
    console.error("Stream reader error:", err);
    onError(err.message || "Connection lost.");
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
