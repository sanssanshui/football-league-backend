"use client";

import { useState, useEffect, useRef } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5002";
const AI_CHAT_API = `${API_URL}/ai/chat`;

const QUICK_QUESTIONS = [
  "什么是越位规则？",
  "世界杯夺冠次数最多的球队？",
  "足球阵型433和4231的区别？",
  "金球奖评选规则是什么？"
];

export default function FootballAiChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "bot"; content: string; images?: string[] }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 处理文件选择 → base64
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 4 - pendingImages.length;
    const selected = files.slice(0, remaining);

    selected.forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      if (file.size > 10 * 1024 * 1024) return; // 最大10MB

      const reader = new FileReader();
      reader.onload = () => {
        setPendingImages((prev) => [...prev, reader.result as string].slice(0, 4));
      };
      reader.readAsDataURL(file);
    });

    // 重置input以允许重复选择同一文件
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePendingImage = (index: number) => {
    setPendingImages((prev) => prev.filter((_, i) => i !== index));
  };

  // 发送消息
  const sendMessage = async (content?: string) => {
    const text = (content ?? inputValue).trim();
    if (!text && pendingImages.length === 0) return;
    if (isLoading) return;

    const userMsg = {
      role: "user" as const,
      content: text || "[图片]",
      images: pendingImages.length > 0 ? [...pendingImages] : undefined,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    const imgs = [...pendingImages];
    setPendingImages([]);
    setIsLoading(true);

    try {
      const body: any = {};
      if (text) body.question = text;
      if (imgs.length > 0) body.imageUrls = imgs;

      const res = await fetch(AI_CHAT_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.ok) {
        setMessages((prev) => [...prev, { role: "bot", content: data.answer || "抱歉，我暂时无法回答这个问题。" }]);
      } else {
        setMessages((prev) => [...prev, { role: "bot", content: `请求出错：${data.message || "未知错误"}` }]);
      }
    } catch (err) {
      console.error("AI请求错误：", err);
      setMessages((prev) => [...prev, { role: "bot", content: "网络异常，无法连接到AI服务，请检查后端服务是否启动。" }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!mounted) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[99999] flex flex-col items-end">
      {/* 聊天面板 */}
      {isOpen && (
        <div
          className="mb-4 bg-white rounded-2xl shadow-2xl border-4 border-emerald-500 flex flex-col overflow-hidden"
          style={{ width: '420px', height: '600px', zIndex: 99999 }}
        >
          {/* 头部 */}
          <div className="bg-emerald-600 text-white px-5 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <span className="font-bold text-white text-lg">⚽</span>
              </div>
              <div>
                <div className="font-bold text-lg">足球AI小助手</div>
                <div className="text-xs text-white/80">支持上传图片 · 多模态分析</div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white transition-colors text-xl"
              title="收起"
            >
              ✕
            </button>
          </div>

          {/* 消息区域 */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50 min-h-0">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm">
                <div className="text-4xl mb-3">⚽</div>
                <p>嗨！我是你的足球AI助手</p>
                <p>可以上传战术板、比赛截图等图片让我分析</p>
              </div>
            )}

            {messages.map((msg, index) => (
              <div
                key={index}
                className={`mb-4 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                    msg.role === "user"
                      ? "bg-emerald-600 text-white rounded-tr-none"
                      : "bg-white border border-gray-200 text-gray-800 rounded-tl-none"
                  }`}
                >
                  {/* 图片预览 */}
                  {msg.images && msg.images.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap mb-2">
                      {msg.images.map((img, i) => (
                        <img
                          key={i}
                          src={img}
                          className="max-w-[120px] max-h-[80px] rounded-lg object-cover border border-white/30"
                          alt="上传图片"
                        />
                      ))}
                    </div>
                  )}
                  <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start mb-4">
                <div className="max-w-[80%] px-4 py-3 rounded-2xl bg-white border border-gray-200 text-gray-500 rounded-tl-none">
                  正在思考中...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 待上传图片预览 */}
          {pendingImages.length > 0 && (
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex gap-2 flex-wrap shrink-0">
              {pendingImages.map((img, i) => (
                <div key={i} className="relative group">
                  <img src={img} className="w-14 h-14 rounded-lg object-cover border-2 border-emerald-400" alt="" />
                  <button
                    onClick={() => removePendingImage(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 快捷提问 */}
          {messages.length === 0 && (
            <div className="p-3 bg-white border-t border-gray-200 grid grid-cols-2 gap-2 shrink-0">
              {QUICK_QUESTIONS.map((q, index) => (
                <button
                  key={index}
                  onClick={() => sendMessage(q)}
                  className="text-xs px-3 py-2 bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg text-gray-600 transition-colors text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* 输入区域 */}
          <div className="p-3 bg-white border-t border-gray-200 flex items-end gap-2 shrink-0">
            {/* 上传按钮 */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-10 h-10 flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 hover:border-emerald-500 text-gray-400 hover:text-emerald-600 transition-colors shrink-0"
              title="上传图片（最多4张）"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />

            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 h-10 max-h-32 text-sm"
              placeholder={pendingImages.length > 0 ? "输入问题（可选），按回车发送" : "输入问题，按回车发送（Shift+Enter换行）"}
              disabled={isLoading}
            />
            <button
              onClick={() => sendMessage()}
              disabled={isLoading || (!inputValue.trim() && pendingImages.length === 0)}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg transition-colors h-10 shrink-0 text-sm font-medium"
            >
              发送
            </button>
          </div>
        </div>
      )}

      {/* 悬浮按钮 */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-16 h-16 bg-emerald-600 hover:bg-emerald-700 rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-105 text-white"
        title="足球AI助手"
      >
        <span className="text-2xl">⚽</span>
      </button>
    </div>
  );
}
