"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// Cache-busting: changes on every build to force fresh controller.html
const L2D_CACHE_BUSTER = Date.now();
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useServerTTS } from "@/hooks/useServerTTS";
import { dhChatStream, dhHealthCheck } from "@/lib/api/digitalHumanV2";
import { useDigitalHumanSocket } from "@/lib/digitalHumanSocket";

type Phase = "idle" | "listening" | "thinking" | "speaking";

const PHASE_LABEL: Record<Phase, string> = {
  idle: "点击麦克风对话",
  listening: "聆听中...",
  thinking: "思考中...",
  speaking: "回答中...",
};

// Natori model expression mapping (11 expressions)
// Normal=Neutral, Smile=Happy, Surprised=Wide eyes, Sad=Sad, Angry=Angry,
// Blushing=Embarrassed, exp_01=Distorted/worried, exp_02=Excited smile,
// exp_03=Relaxed/disappointed, exp_04=Curious/interested, exp_05=Content/pleased
const PHASE_EXPRESSION: Record<Phase, string> = {
  idle: "Normal",
  listening: "exp_04",    // Curious wide eyes, attentive
  thinking: "Surprised",  // Wide eyes, raised brows, pondering
  speaking: "Smile",      // Smiling while talking
};

export default function DigitalHumanSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "bot"; content: string }[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [partialText, setPartialText] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const [fayOnline, setFayOnline] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const live2dIframeRef = useRef<HTMLIFrameElement | null>(null);
  const prevPhaseRef = useRef<Phase>("idle");

  const { speak, cancel: cancelTTS, isSpeaking } = useServerTTS();

  // Socket.IO streaming hook (optional, used for real-time streaming)
  useDigitalHumanSocket({
    onTextChunk: (content) => {
      setStreamingText((prev) => prev + content);
    },
    onDone: (fullText) => {
      if (fullText) {
        setMessages((p) => [...p, { role: "bot", content: fullText }]);
        if (isOpen) {
          setPhase("speaking");
          speak(fullText);
        }
      }
      setStreamingText("");
      if (phase !== "speaking") setPhase("idle");
    },
    onError: (msg) => {
      setMessages((p) => [...p, { role: "bot", content: `错误: ${msg}` }]);
      setPhase("idle");
    },
  });

  // Send state to Live2D (controls body pose: idle, listen, think, speak)
  const sendState = useCallback((state: string) => {
    if (live2dIframeRef.current?.contentWindow) {
      live2dIframeRef.current.contentWindow.postMessage(
        { type: "state", state },
        "*"
      );
    }
  }, []);

  // Send expression to Live2D (for initial/fallback expression)
  const sendExpression = useCallback((name: string) => {
    if (live2dIframeRef.current?.contentWindow) {
      live2dIframeRef.current.contentWindow.postMessage(
        { type: "expression", name },
        "*"
      );
    }
  }, []);

  // Update character state when phase changes
  useEffect(() => {
    if (phase !== prevPhaseRef.current) {
      prevPhaseRef.current = phase;
      // Map phase to state command
      const stateMap: Record<Phase, string> = {
        idle: "idle",
        listening: "listen",
        thinking: "think",
        speaking: "speak",
      };
      sendState(stateMap[phase] || "idle");
      // Also set fallback expression
      const expr = PHASE_EXPRESSION[phase] || "Normal";
      sendExpression(expr);
    }
  }, [phase, sendState, sendExpression]);

  // Handle user text input (from mic or text) via SSE streaming
  const handleUserInput = useCallback(async (text: string) => {
    setPhase("thinking");
    setMessages((p) => [...p, { role: "user", content: text }]);
    setStreamingText("");

    let botText = "";

    try {
      await dhChatStream(text, {
        onText: (chunk) => {
          botText += chunk;
          setStreamingText(botText);
        },
        onThink: (chunk) => {
          // Thinking content — keep in thinking phase
          if (phase !== "thinking") setPhase("thinking");
        },
        onDone: (fullText) => {
          const finalText = fullText || botText || "抱歉，我暂时无法回答。";
          setMessages((p) => [...p, { role: "bot", content: finalText }]);
          setStreamingText("");

          // Switch to speaking — expression will auto-update via useEffect
          setPhase("speaking");
          speak(finalText);
        },
        onError: (err) => {
          setMessages((p) => [...p, { role: "bot", content: `网络异常: ${err}` }]);
          setStreamingText("");
          setPhase("idle");
          sendExpression("Sad"); // Sad expression on error
        },
      });
    } catch {
      setMessages((p) => [...p, { role: "bot", content: "网络异常，无法连接AI服务。" }]);
      setStreamingText("");
      setPhase("idle");
      sendExpression("Sad");
    }
  }, [speak, phase, sendExpression]);

  // Check if Fay is online
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
    onResult: handleUserInput,
    onInterim: setPartialText,
    onError: () => { setPhase("idle"); sendExpression("Sad"); },
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

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") handleInterrupt(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  if (!mounted) return null;

  return (
    <>
      <div className={`fixed top-0 right-0 h-full z-[99999] transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "translate-x-full"}`}
        style={{ width: "460px" }}>
        <div className="flex-1 h-full flex flex-col bg-black/10 backdrop-blur-sm border-l border-white/10">
          {/* Header */}
          <div className="h-14 shrink-0 flex items-center justify-between px-4 border-b border-white/10 bg-black/10 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${
                phase==="idle"?"bg-green-400"
                :phase==="listening"?"bg-red-400 animate-pulse"
                :phase==="thinking"?"bg-yellow-400 animate-pulse"
                :"bg-blue-400 animate-pulse"}`} />
              <span className="text-white text-sm font-medium">AI足球数字人</span>
              <span className={`text-[10px] ${fayOnline ? "text-green-400" : "text-red-400"}`}>
                {fayOnline ? "·在线" : "·离线"}
              </span>
              {isRecording && <span className="text-red-400 text-xs animate-pulse">REC</span>}
              {phase === "thinking" && <span className="text-yellow-400 text-xs animate-pulse">思考中</span>}
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/50 hover:text-white text-lg">✕</button>
          </div>

          {/* Live2D Character — Hiyori model via controller.html */}
<div className="flex-[3] flex flex-col items-center relative min-h-0 p-2">
  <div className="w-full h-full rounded-xl overflow-hidden border-2 relative transition-all duration-300"
    style={{
      boxShadow: phase==="speaking"?"0 0 30px rgba(59,130,246,0.5)"
        :phase==="listening"?"0 0 30px rgba(239,68,68,0.5)"
        :phase==="thinking"?"0 0 30px rgba(234,179,8,0.5)"
        :"0 0 20px rgba(168,85,247,0.15)",
      borderColor: phase==="speaking"?"rgba(59,130,246,0.5)"
        :phase==="listening"?"rgba(239,68,68,0.5)"
        :phase==="thinking"?"rgba(234,179,8,0.5)"
        :"rgba(168,85,247,0.2)"
    }}>
    {!loaded && (
      <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
        <span className="text-white/40 text-sm">AI角色加载中...</span>
      </div>
    )}
    <iframe
      ref={live2dIframeRef}
      src={`/live2d-demo/controller.html?v=${L2D_CACHE_BUSTER}`}
      className="w-full h-full border-none"
      style={{ background: "transparent" }}
      title="AI数字人 Hiyori"
      allow="autoplay"
      onLoad={() => {
        setLoaded(true);
        // Send initial idle expression once iframe is ready
        setTimeout(() => sendExpression("Normal"), 500);
      }}
    />
    {/* Phase overlay */}
    {phase !== "idle" && (
      <div className="absolute bottom-0 left-0 right-0 py-1.5 text-center text-xs font-medium text-white z-10"
        style={{ background: `linear-gradient(transparent, ${
          phase==="speaking"?"rgba(59,130,246,0.7)"
          :phase==="listening"?"rgba(239,68,68,0.7)"
          :"rgba(234,179,8,0.7)"
        })` }}>
        {PHASE_LABEL[phase]}
      </div>
    )}
  </div>

  {phase === "listening" && partialText && (
    <p className="text-green-400/80 text-xs mt-2 max-w-[280px] text-center">
      "{partialText}"<span className="animate-pulse">|</span>
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
                <p className="text-xs mt-1 text-white/10">Chrome/Edge · 允许麦克风权限</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`mb-3 flex ${m.role==="user"?"justify-end":"justify-start"}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm whitespace-pre-wrap ${
                  m.role==="user"
                    ?"bg-purple-600/40 backdrop-blur-md text-white rounded-tr-none border border-purple-400/20"
                    :"bg-black/30 backdrop-blur-md text-white/90 rounded-tl-none border border-white/10"
                }`}>
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

          {/* Quick actions */}
          {messages.length === 0 && (
            <div className="shrink-0 px-4 py-2 border-t border-white/5 grid grid-cols-2 gap-2">
              {["什么是越位？","苏超有哪些球队？","世界杯夺冠最多的国家？","足球比赛多长时间？"].map((q, i) => (
                <button key={i} onClick={() => handleUserInput(q)}
                  className="text-xs px-2 py-1.5 rounded-lg bg-black/20 backdrop-blur-sm text-white/60 hover:bg-black/30 hover:text-white/90 transition-colors text-left border border-white/10">{q}</button>
              ))}
            </div>
          )}

          {/* Controls */}
          <div className="shrink-0 h-16 flex items-center justify-center gap-6 border-t border-white/10 bg-black/10 backdrop-blur-sm">
            <button onClick={toggleMic}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                isRecording
                  ?"bg-red-500 text-white scale-110 shadow-[0_0_20px_rgba(239,68,68,0.5)] animate-pulse"
                  :"bg-white/10 text-white/60 hover:bg-white/20 hover:scale-105"
              }`}
              title={isRecording ? "停止" : "开始录音"}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
              </svg>
            </button>
            <button onClick={handleInterrupt} disabled={phase !== "speaking" && !isSpeaking}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                phase==="speaking" || isSpeaking
                  ?"bg-orange-500/20 text-orange-400 border border-orange-500/30 hover:bg-orange-500/30"
                  :"bg-white/5 text-white/20"
              }`}
              title="打断 (Esc)">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>
            </button>
          </div>
        </div>
      </div>

      <button onClick={() => setIsOpen(p => !p)}
        className="fixed bottom-24 right-6 z-[99999] w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-105 overflow-hidden backdrop-blur-md border border-white/20"
        style={{ background: isOpen
          ?"linear-gradient(135deg,rgba(220,38,38,0.8),rgba(153,27,27,0.8))"
          :"linear-gradient(135deg,rgba(0,128,0,0.8),rgba(0,180,0,0.8))"
        }}
        title="AI足球数字人">
        {isOpen ? <span className="text-white text-xl">✕</span> : <span className="text-white text-2xl">⚽</span>}
      </button>
    </>
  );
}
