"use client";

import { useRef, useCallback, useState } from "react";

interface Options {
  lang?: string;
  onResult?: (text: string) => void;
  onInterim?: (text: string) => void;
  onError?: (err: string) => void;
  onStart?: () => void;
}

export function useSpeechRecognition(opts: Options = {}) {
  const { lang = "zh-CN", onResult, onInterim, onError, onStart } = opts;
  const [isRecording, setIsRecording] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const activeRef = useRef(false);
  const recognitionRef = useRef<any>(null);
  const restartTimerRef = useRef<any>(null);
  const finalBufferRef = useRef("");

  const createRecognition = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setErrorMsg("当前浏览器不支持语音识别，请使用 Chrome 或 Edge");
      onError?.("浏览器不支持");
      return null;
    }

    const r = new SR();
    r.lang = lang;
    r.interimResults = true;
    r.continuous = false; // 单次识别，靠自动重启实现连续
    r.maxAlternatives = 1;

    r.onresult = (e: any) => {
      let final = "", interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) {
          final += res[0].transcript;
        } else {
          interim += res[0].transcript;
        }
      }
      if (final) {
        finalBufferRef.current += final;
      }
      if (interim) {
        onInterim?.(finalBufferRef.current + interim);
      }
    };

    r.onerror = (e: any) => {
      console.log("[Speech] error:", e.error);
      if (e.error === "not-allowed") {
        setErrorMsg("麦克风权限被拒绝，请在浏览器设置中允许麦克风访问");
        onError?.("麦克风权限被拒");
        setIsRecording(false);
        activeRef.current = false;
      } else if (e.error === "no-speech") {
        // No speech detected, will auto-restart
      } else if (e.error !== "aborted") {
        onError?.(e.error);
      }
    };

    r.onend = () => {
      // Auto-restart if still in recording mode
      if (activeRef.current) {
        // Small delay before restarting to avoid rapid loops
        restartTimerRef.current = setTimeout(() => {
          if (activeRef.current) {
            try { r.start(); } catch {}
          }
        }, 100);
      } else {
        // User stopped recording - flush accumulated text
        const accumulated = finalBufferRef.current.trim();
        if (accumulated) {
          onResult?.(accumulated);
        }
        finalBufferRef.current = "";
      }
    };

    return r;
  }, [lang, onResult, onInterim, onError]);

  const start = useCallback(() => {
    console.log("[Speech] Starting...");
    setErrorMsg(null);
    activeRef.current = true;
    finalBufferRef.current = "";
    setIsRecording(true);
    onStart?.();

    const r = createRecognition();
    if (!r) return;
    recognitionRef.current = r;

    try {
      r.start();
      console.log("[Speech] Recognition started");
    } catch (err: any) {
      console.error("[Speech] Start error:", err);
      setErrorMsg("启动语音识别失败: " + (err.message || "未知错误"));
      setIsRecording(false);
      activeRef.current = false;
    }
  }, [createRecognition, onStart]);

  const stop = useCallback(() => {
    console.log("[Speech] Stopping...");
    activeRef.current = false;
    clearTimeout(restartTimerRef.current);
    try { recognitionRef.current?.stop(); } catch {}
    recognitionRef.current = null;

    // Flush accumulated text
    const accumulated = finalBufferRef.current.trim();
    if (accumulated) {
      onResult?.(accumulated);
    }
    finalBufferRef.current = "";
    setIsRecording(false);
  }, [onResult]);

  return { isRecording, start, stop, errorMsg };
}
