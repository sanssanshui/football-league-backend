"use client";

import { useState, useEffect, useRef, useCallback, type ChangeEvent, type DragEvent } from "react";
import { Image as ImageIcon, Paperclip, X, ChevronDown } from "lucide-react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useServerTTS } from "@/hooks/useServerTTS";
import { dhChatStream, dhHealthCheck, dhChatStreamMultimodal, type UploadedFileInfo } from "@/lib/api/digitalHumanV2";
import Live2DCharacter, { AVAILABLE_MODELS } from "@/components/Live2DCharacter";

type Phase = "idle" | "listening" | "thinking" | "speaking";

const PHASE_LABEL: Record<Phase, string> = {
  idle: "点击麦克风对话",
  listening: "聆听中...",
  thinking: "思考中...",
  speaking: "回答中...",
};

export default function DigitalHumanSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "bot"; content: string; imageUrl?: string }[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [partialText, setPartialText] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const [fayOnline, setFayOnline] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [model, setModel] = useState<string>("HaruGreeter");
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [uploads, setUploads] = useState<UploadedFileInfo[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const { speak, speakWithLipSync, cancel: cancelTTS, isSpeaking } = useServerTTS();

  // Handle user input
  const handleUserInput = useCallback(async (text: string, attachedFiles?: UploadedFileInfo[]) => {
    if (!text.trim() && (!attachedFiles || attachedFiles.length === 0)) return;

    setPhase("thinking");
    const imageUrl = attachedFiles?.find((f) => f.type === "image")?.dataUrl;
    setMessages((p) => [...p, { role: "user", content: text || "[图片/文件]", imageUrl }]);
    setStreamingText("");
    setTextInput("");
    setUploads([]);

    let botText = "";

    try {
      const images = (attachedFiles || []).filter((f) => f.type === "image");
      const files = (attachedFiles || []).filter((f) => f.type === "file");

      if (images.length > 0 || files.length > 0) {
        await dhChatStreamMultimodal(text, images, files, {
          onText: (chunk) => {
            botText += chunk;
            setStreamingText(botText);
          },
          onThink: () => {
            if (phase !== "thinking") setPhase("thinking");
          },
          onDone: (fullText) => {
            const finalText = fullText || botText || "抱歉，我暂时无法回答。";
            setMessages((p) => [...p, { role: "bot", content: finalText }]);
            setStreamingText("");
            setPhase("speaking");
            speakWithLipSync(finalText);
          },
          onError: (err) => {
            setMessages((p) => [...p, { role: "bot", content: `网络异常: ${err}` }]);
            setStreamingText("");
            setPhase("idle");
          },
        });
      } else {
        await dhChatStream(text, {
          onText: (chunk) => {
            botText += chunk;
            setStreamingText(botText);
          },
          onThink: () => {
            if (phase !== "thinking") setPhase("thinking");
          },
          onDone: (fullText) => {
            const finalText = fullText || botText || "抱歉，我暂时无法回答。";
            setMessages((p) => [...p, { role: "bot", content: finalText }]);
            setStreamingText("");
            setPhase("speaking");
            speakWithLipSync(finalText);
          },
          onError: (err) => {
            setMessages((p) => [...p, { role: "bot", content: `网络异常: ${err}` }]);
            setStreamingText("");
            setPhase("idle");
          },
        });
      }
    } catch {
      setMessages((p) => [...p, { role: "bot", content: "网络异常，无法连接AI服务。" }]);
      setStreamingText("");
      setPhase("idle");
    }
  }, [speak, phase]);

  // Health check
  useEffect(() => {
    let cancelled = false;
    dhHealthCheck().then((ok) => { if (!cancelled) setFayOnline(ok); });
    const interval = setInterval(() => {
      dhHealthCheck().then((ok) => { if (!cancelled) setFayOnline(ok); });
    }, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const { isRecording, start, stop, errorMsg } = useSpeechRecognition({
    lang: "zh-CN",
    onResult: (text) => handleUserInput(text, uploads),
    onInterim: setPartialText,
    onError: () => setPhase("idle"),
  });

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  // Reset phase when TTS finishes
  useEffect(() => {
    if (phase === "speaking" && !isSpeaking) {
      setPhase("idle");
    }
  }, [phase, isSpeaking]);

  // === Phase-based expression & motion control ===
  const exprTriggeredRef = useRef<string>("");

  useEffect(() => {
    const trigger = async () => {
      try {
        const { Live2dManager } = await import("@/lib/live2d/live2dManager");
        const mgr = Live2dManager.getInstance();

        // Don't re-trigger the same expression for the same phase
        const key = `${phase}`;
        if (exprTriggeredRef.current === key) return;
        exprTriggeredRef.current = key;

        switch (phase) {
          case "idle":
            mgr.setExpression("Normal");
            break;

          case "listening":
            mgr.setExpression("exp_04");
            mgr.startRandomMotion("Idle", 2);
            break;

          case "thinking":
            mgr.setExpression("Surprised");
            mgr.startRandomMotion("Idle", 2);
            break;

          case "speaking":
            // Expression will be set dynamically when bot text arrives
            break;
        }
      } catch {}
    };

    trigger();
  }, [phase]);

  // Simple keyword-based sentiment → expression for speaking phase
  const getSentimentExpression = useCallback((text: string): string => {
    const t = text;
    // Happy/Positive
    if (/哈哈|嘿嘿|嘻嘻|开心|恭喜|太棒|厉害|精彩|漂亮|优秀|真棒|好球|进球|赢了|胜利/.test(t)) {
      return "Smile";
    }
    // Surprised
    if (/天哪|哇|居然|竟然|不可思议|没想到|震惊|惊人/.test(t)) {
      return "Surprised";
    }
    // Sad/Regret
    if (/抱歉|遗憾|可惜|输|失败|难过|伤心|失误/.test(t)) {
      return "Sad";
    }
    // Angry
    if (/犯规|红牌|黄牌|黑哨|不公|生气|可恶/.test(t)) {
      return "Angry";
    }
    // Gentle/Calm (default for neutral speech)
    return "Smile";
  }, []);

  // When bot text arrives during speaking, set expression based on sentiment
  useEffect(() => {
    if (phase !== "speaking") return;

    // Trigger a speaking motion
    const triggerMotion = async () => {
      try {
        const { Live2dManager } = await import("@/lib/live2d/live2dManager");
        Live2dManager.getInstance().startRandomMotion("Idle", 3);
      } catch {}
    };
    triggerMotion();
  }, [phase, streamingText]);

  // When full bot message arrives, set sentiment-based expression
  useEffect(() => {
    if (phase !== "speaking") return;
    const lastBotMsg = messages.filter(m => m.role === "bot").pop();
    if (!lastBotMsg) return;

    const expr = getSentimentExpression(lastBotMsg.content);
    const key = `speaking-${expr}`;
    if (exprTriggeredRef.current === key) return;
    exprTriggeredRef.current = key;

    const setExpr = async () => {
      try {
        const { Live2dManager } = await import("@/lib/live2d/live2dManager");
        Live2dManager.getInstance().setExpression(expr);
      } catch {}
    };
    setExpr();
  }, [phase, messages, getSentimentExpression]);

  const toggleMic = () => {
    if (isRecording) {
      stop();
      setPhase("idle");
    } else {
      setPhase("listening");
      setPartialText("");
      start();
    }
  };

  const handleInterrupt = () => {
    cancelTTS();
    setPhase("idle");
  };

  const handleSendText = () => {
    if (!textInput.trim() && uploads.length === 0) return;
    handleUserInput(textInput, uploads);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  // File upload handlers
  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const reader = new FileReader();
      reader.onload = () => {
        setUploads((prev) => [...prev, { name: file.name, type: "image", dataUrl: reader.result as string, file }]);
      };
      reader.readAsDataURL(file);
    }
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      if (file.type.startsWith("image/")) continue;
      setUploads((prev) => [...prev, { name: file.name, type: "file", file }]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeUpload = (idx: number) => {
    setUploads((prev) => prev.filter((_, i) => i !== idx));
  };

  // Drag and drop
  const handleDragOver = (e: DragEvent) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = (e: DragEvent) => { e.preventDefault(); setDragOver(false); };
  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    for (const file of Array.from(e.dataTransfer.files)) {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = () => {
          setUploads((prev) => [...prev, { name: file.name, type: "image", dataUrl: reader.result as string, file }]);
        };
        reader.readAsDataURL(file);
      } else {
        setUploads((prev) => [...prev, { name: file.name, type: "file", file }]);
      }
    }
  };

  // Escape key to interrupt
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") handleInterrupt(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  if (!mounted) return null;

  return (
    <>
      <div
        className={`fixed top-0 right-0 h-full z-[99999] transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "translate-x-full"}`}
        style={{ width: "460px" }}
      >
        <div className="flex-1 h-full flex flex-col bg-black/10 backdrop-blur-sm border-l border-white/10">
          {/* Header */}
          <div className="h-14 shrink-0 flex items-center justify-between px-4 border-b border-white/10 bg-black/10 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  phase === "idle" ? "bg-green-400"
                  : phase === "listening" ? "bg-red-400 animate-pulse"
                  : phase === "thinking" ? "bg-yellow-400 animate-pulse"
                  : "bg-blue-400 animate-pulse"
                }`}
              />
              <span className="text-white text-sm font-medium">AI足球数字人</span>
              <span className={`text-[10px] ${fayOnline ? "text-green-400" : "text-red-400"}`}>
                {fayOnline ? "·在线" : "·离线"}
              </span>
              {isRecording && <span className="text-red-400 text-xs animate-pulse">REC</span>}
              {phase === "thinking" && <span className="text-yellow-400 text-xs animate-pulse">思考中</span>}
            </div>

            <button onClick={() => setIsOpen(false)} className="text-white/50 hover:text-white text-lg">✕</button>
          </div>

          {/* Live2D Character */}
          <div className="flex-[3] flex flex-col items-center relative min-h-0 p-2"
            onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
            <div
              className="w-full h-full rounded-xl overflow-hidden border-2 relative transition-all duration-300"
              style={{
                boxShadow: dragOver ? "0 0 30px rgba(0,255,0,0.6)" :
                  phase === "speaking" ? "0 0 30px rgba(59,130,246,0.5)"
                  : phase === "listening" ? "0 0 30px rgba(239,68,68,0.5)"
                  : phase === "thinking" ? "0 0 30px rgba(234,179,8,0.5)"
                  : "0 0 20px rgba(168,85,247,0.15)",
                borderColor: dragOver ? "rgba(0,255,0,0.6)" :
                  phase === "speaking" ? "rgba(59,130,246,0.5)"
                  : phase === "listening" ? "rgba(239,68,68,0.5)"
                  : phase === "thinking" ? "rgba(234,179,8,0.5)"
                  : "rgba(168,85,247,0.2)",
              }}
            >
              <Live2DCharacter modelName={model} />

              {/* Drag overlay */}
              {dragOver && (
                <div className="absolute inset-0 bg-[#00ff00]/10 flex items-center justify-center z-10 pointer-events-none">
                  <span className="text-[#00ff00] text-lg font-bold">拖放图片/文件到此处</span>
                </div>
              )}

              {/* Phase overlay */}
              {phase !== "idle" && (
                <div
                  className="absolute bottom-0 left-0 right-0 py-1.5 text-center text-xs font-medium text-white z-10"
                  style={{
                    background: `linear-gradient(transparent, ${
                      phase === "speaking" ? "rgba(59,130,246,0.7)"
                      : phase === "listening" ? "rgba(239,68,68,0.7)"
                      : "rgba(234,179,8,0.7)"
                    })`,
                  }}
                >
                  {PHASE_LABEL[phase]}
                </div>
              )}
            </div>

            {phase === "listening" && partialText && (
              <p className="text-green-400/80 text-xs mt-2 max-w-[280px] text-center">
                &ldquo;{partialText}&rdquo;<span className="animate-pulse">|</span>
              </p>
            )}
            {errorMsg && <p className="text-red-400/80 text-xs mt-2 max-w-[280px] text-center">{errorMsg}</p>}
          </div>

          {/* Messages */}
          <div className="flex-[1] overflow-y-auto px-4 py-3 min-h-0">
            {messages.length === 0 && !streamingText && (
              <div className="h-full flex flex-col items-center justify-center text-white/20 text-sm">
                <div className="text-3xl mb-2">⚽</div>
                <p>点击下方麦克风开始语音对话</p>
                <p className="text-xs mt-1 text-white/10">支持文字输入 · 图片上传 · 文件上传</p>
                <p className="text-xs text-white/10">Chrome/Edge · 允许麦克风权限</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`mb-3 flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-xl text-sm whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-purple-600/40 backdrop-blur-md text-white rounded-tr-none border border-purple-400/20"
                      : "bg-black/30 backdrop-blur-md text-white/90 rounded-tl-none border border-white/10"
                  }`}
                >
                  {m.imageUrl && (
                    <img src={m.imageUrl} alt="uploaded" className="max-w-[200px] max-h-[150px] rounded-lg mb-2 object-cover" />
                  )}
                  {m.content}
                </div>
              </div>
            ))}
            {streamingText && (
              <div className="mb-3 flex justify-start">
                <div className="max-w-[85%] px-3 py-2 rounded-xl text-sm whitespace-pre-wrap bg-black/30 backdrop-blur-md text-white/90 rounded-tl-none border border-[#00ff00]/20">
                  {streamingText}
                  <span className="inline-block w-1.5 h-4 bg-[#00ff00] ml-0.5 animate-pulse align-middle" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Upload preview area */}
          {uploads.length > 0 && (
            <div className="shrink-0 px-4 py-2 border-t border-white/5 flex gap-2 flex-wrap">
              {uploads.map((f, i) => (
                <div key={i} className="relative group">
                  {f.type === "image" && f.dataUrl ? (
                    <img src={f.dataUrl} alt={f.name} className="h-12 w-12 object-cover rounded-lg border border-white/10" />
                  ) : (
                    <div className="h-12 w-12 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center text-white/40">
                      <Paperclip className="w-5 h-5" />
                    </div>
                  )}
                  <span className="absolute bottom-0 left-0 right-0 text-[8px] text-white/50 truncate px-0.5 bg-black/30 rounded-b">
                    {f.name.length > 8 ? f.name.slice(0, 6) + ".." : f.name}
                  </span>
                  <button
                    onClick={() => removeUpload(i)}
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Quick actions */}
          {messages.length === 0 && (
            <div className="shrink-0 px-4 py-2 border-t border-white/5 grid grid-cols-2 gap-2">
              {["什么是越位？", "苏超有哪些球队？", "世界杯夺冠最多的国家？", "足球比赛多长时间？"].map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleUserInput(q)}
                  className="text-xs px-2 py-1.5 rounded-lg bg-black/20 backdrop-blur-sm text-white/60 hover:bg-black/30 hover:text-white/90 transition-colors text-left border border-white/10"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Text input area */}
          <div className="shrink-0 px-4 py-2 border-t border-white/10 bg-black/10">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="输入文字..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 h-9 bg-white/5 border border-white/10 rounded-xl px-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#00ff00]/30"
              />
              <button
                onClick={() => imageInputRef.current?.click()}
                className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all"
                title="上传图片"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all"
                title="上传文件"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <button
                onClick={handleSendText}
                className="w-8 h-8 rounded-lg bg-[#00ff00]/20 border border-[#00ff00]/30 flex items-center justify-center text-[#00ff00] hover:bg-[#00ff00]/30 transition-all"
                title="发送"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Hidden file inputs */}
          <input ref={imageInputRef} type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
          <input ref={fileInputRef} type="file" accept=".txt,.pdf,.doc,.docx,.csv,.json,.md" multiple onChange={handleFileUpload} className="hidden" />

          {/* Controls */}
          <div className="shrink-0 border-t border-white/10 bg-black/10 backdrop-blur-sm px-4 py-2">
            {/* Model selector row */}
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-white/30 text-[10px]">角色:</span>
              <div className="relative">
                <button
                  onClick={() => setModelPickerOpen((p) => !p)}
                  className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 border border-white/10 text-white/60 text-[11px] hover:bg-white/10 transition-all"
                >
                  {model}
                  <ChevronDown className="w-3 h-3" />
                </button>
                {modelPickerOpen && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-black/90 backdrop-blur-xl border border-white/20 rounded-xl py-1 z-[99999] min-w-[120px] max-h-[200px] overflow-y-auto">
                    {AVAILABLE_MODELS.map((m) => (
                      <button
                        key={m}
                        onClick={() => { setModel(m); setModelPickerOpen(false); }}
                        className={`block w-full text-left px-3 py-1.5 text-[11px] hover:bg-white/10 transition-all whitespace-nowrap ${
                          m === model ? "text-[#00ff00]" : "text-white/60"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {/* Mic + Stop buttons */}
            <div className="flex items-center justify-center gap-6">
              <button
                onClick={toggleMic}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isRecording
                    ? "bg-red-500 text-white scale-110 shadow-[0_0_20px_rgba(239,68,68,0.5)] animate-pulse"
                    : "bg-white/10 text-white/60 hover:bg-white/20 hover:scale-105"
                }`}
                title={isRecording ? "停止" : "开始录音"}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </button>
              <button
                onClick={handleInterrupt}
                disabled={phase !== "speaking" && !isSpeaking}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  phase === "speaking" || isSpeaking
                    ? "bg-orange-500/20 text-orange-400 border border-orange-500/30 hover:bg-orange-500/30"
                    : "bg-white/5 text-white/20"
                }`}
                title="打断 (Esc)"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Toggle button */}
      <button
        onClick={() => setIsOpen((p) => !p)}
        className="fixed bottom-24 right-6 z-[99999] w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-105 overflow-hidden backdrop-blur-md border border-white/20"
        style={{
          background: isOpen
            ? "linear-gradient(135deg,rgba(220,38,38,0.8),rgba(153,27,27,0.8))"
            : "linear-gradient(135deg,rgba(0,128,0,0.8),rgba(0,180,0,0.8))",
        }}
        title="AI足球数字人"
      >
        {isOpen ? <span className="text-white text-xl">✕</span> : <span className="text-white text-2xl">⚽</span>}
      </button>
    </>
  );
}
