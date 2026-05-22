const API_BASE = process.env.NEXT_PUBLIC_DIGITAL_HUMAN_API || "http://localhost:5002";

interface ChatStreamCallbacks {
  onText?: (chunk: string) => void;
  onThink?: (chunk: string) => void;
  onDone?: (fullText: string) => void;
  onError?: (err: string) => void;
}

interface UploadedFileInfo {
  name: string;
  type: "image" | "file";
  dataUrl?: string;
  file: File;
}

function getAuthHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function parseSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  decoder: TextDecoder,
  callbacks: ChatStreamCallbacks
): Promise<void> {
  const { onText, onThink, onDone, onError } = callbacks;
  let fullText = "";
  let buffer = "";

  return new Promise((resolve) => {
    function pump() {
      reader.read().then(({ done, value }) => {
        if (done) {
          onDone?.(fullText);
          resolve();
          return;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "text" || parsed.type === "TEXT") {
              if (parsed.content) {
                onText?.(parsed.content);
                fullText += parsed.content;
              }
            } else if (parsed.type === "think" || parsed.type === "THINK") {
              if (parsed.content) onThink?.(parsed.content);
            } else if (parsed.type === "DONE" || parsed.type === "done") {
              fullText = parsed.fullText || fullText;
            }
          } catch {
            // Ignore unparseable lines
          }
        }

        pump();
      }).catch((err) => {
        onError?.(err instanceof Error ? err.message : "Stream error");
        resolve();
      });
    }
    pump();
  });
}

export async function dhHealthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/dh/health`, {
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function dhChatStream(
  text: string,
  callbacks: ChatStreamCallbacks
): Promise<void> {
  const { onError } = callbacks;

  try {
    const res = await fetch(`${API_BASE}/api/dh/chat`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
      body: JSON.stringify({ text }),
    });

    if (!res.ok || !res.body) {
      onError?.(`HTTP ${res.status}`);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    await parseSSEStream(reader, decoder, callbacks);
  } catch (err) {
    onError?.(err instanceof Error ? err.message : "Network error");
  }
}

export async function dhChatStreamMultimodal(
  text: string,
  images: UploadedFileInfo[],
  files: UploadedFileInfo[],
  callbacks: ChatStreamCallbacks
): Promise<void> {
  const { onError } = callbacks;

  try {
    const formData = new FormData();
    formData.append("text", text);

    for (const img of images) {
      formData.append("images", img.file);
    }
    for (const f of files) {
      formData.append("files", f.file);
    }

    const res = await fetch(`${API_BASE}/api/dh/chat/multimodal`, {
      method: "POST",
      headers: { ...getAuthHeader() },
      body: formData,
    });

    if (!res.ok || !res.body) {
      onError?.(`HTTP ${res.status}`);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    await parseSSEStream(reader, decoder, callbacks);
  } catch (err) {
    onError?.(err instanceof Error ? err.message : "Network error");
  }
}

export async function dhTTS(text: string): Promise<ArrayBuffer> {
  const res = await fetch(`${API_BASE}/api/dh/tts`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    throw new Error(`TTS request failed: ${res.status}`);
  }

  return res.arrayBuffer();
}

export { type UploadedFileInfo };
