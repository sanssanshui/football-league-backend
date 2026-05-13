"use client";

import { useRef, useCallback, useState } from "react";

interface TTSOptions {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: string) => void;
}

/**
 * 浏览器内置语音合成 — 免费，支持中文，无需后端API
 * Chrome/Edge 内置高质量中文语音
 */
export function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const cancelRef = useRef(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speak = useCallback(async (text: string, opts: TTSOptions = {}) => {
    cancelRef.current = false;

    // 清理过长的文本（浏览器TTS有长度限制）
    const cleanText = text.slice(0, 500);

    try {
      const synth = window.speechSynthesis;

      // 等待voices加载
      if (synth.getVoices().length === 0) {
        await new Promise<void>((resolve) => {
          synth.onvoiceschanged = () => resolve();
          // 超时保护
          setTimeout(resolve, 2000);
        });
      }

      const utt = new SpeechSynthesisUtterance(cleanText);
      utt.lang = "zh-CN";
      utt.rate = 1.1;
      utt.pitch = 1.0;
      utt.volume = 1.0;

      // 选择最佳中文语音
      const voices = synth.getVoices();
      const zhVoice =
        voices.find((v) => v.lang === "zh-CN" && v.name.includes("Microsoft")) ||
        voices.find((v) => v.lang === "zh-CN" && v.name.includes("Yaoyao")) ||
        voices.find((v) => v.lang === "zh-CN" && v.name.includes("Kangkang")) ||
        voices.find((v) => v.lang === "zh-CN") ||
        voices.find((v) => v.lang.startsWith("zh"));

      if (zhVoice) {
        utt.voice = zhVoice;
        console.log("[TTS] Using voice:", zhVoice.name);
      }

      utt.onstart = () => {
        setIsSpeaking(true);
        opts.onStart?.();
        console.log("[TTS] Speaking:", cleanText.slice(0, 40) + "...");
      };

      utt.onend = () => {
        setIsSpeaking(false);
        cancelRef.current = false;
        opts.onEnd?.();
        console.log("[TTS] Done");
      };

      utt.onerror = (e) => {
        console.error("[TTS] Error:", e.error);
        setIsSpeaking(false);
        if (e.error !== "canceled" && e.error !== "interrupted") {
          opts.onError?.(e.error);
        }
      };

      utteranceRef.current = utt;
      synth.speak(utt);
    } catch (err: any) {
      console.error("[TTS] Exception:", err);
      opts.onError?.(err.message);
      setIsSpeaking(false);
    }
  }, []);

  const cancel = useCallback(() => {
    cancelRef.current = true;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  return { speak, cancel, isSpeaking };
}
