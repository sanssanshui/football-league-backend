"use client";

import { useState, useEffect, useRef } from "react";

// 后端AI接口地址
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const AI_CHAT_API = `${API_URL}/ai/chat`;

// 快捷提问（足球专属）
const QUICK_QUESTIONS = [
  "什么是越位规则？",
  "世界杯夺冠次数最多的球队？",
  "足球阵型433和4231的区别？",
  "金球奖评选规则是什么？"
];

export default function FootballAiChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "bot"; content: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  // 处理客户端渲染，避免SSR水合错误
  useEffect(() => {
    setMounted(true);
  }, []);

  // 自动滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 调试：监听isOpen变化，确认状态正常
  useEffect(() => {
    console.log("对话框状态：", isOpen ? "打开" : "关闭");
  }, [isOpen]);

  // 发送消息核心逻辑
  const sendMessage = async (content: string) => {
    const trimContent = content.trim();
    if (!trimContent || isLoading) return;

    // 添加用户消息
    setMessages(prev => [...prev, { role: "user", content: trimContent }]);
    setInputValue("");
    setIsLoading(true);

    try {
      const res = await fetch(AI_CHAT_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimContent }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessages(prev => [...prev, { role: "bot", content: data.answer || "抱歉，我暂时无法回答这个问题。" }]);
      } else {
        setMessages(prev => [...prev, { role: "bot", content: `请求出错：${data.message || "未知错误"}` }]);
      }
    } catch (err) {
      console.error("AI请求错误：", err);
      setMessages(prev => [...prev, { role: "bot", content: "网络异常，无法连接到AI服务，请检查后端服务是否启动。" }]);
    } finally {
      setIsLoading(false);
    }
  };

  // 回车发送/Shift+Enter换行
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  if (!mounted) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[99999] flex flex-col items-end">
      {/* 聊天面板 ✅ 修复：加高z-index、醒目的边框，确保不被遮挡 */}
      {isOpen && (
        <div 
          className="mb-4 bg-white rounded-2xl shadow-2xl border-4 border-emerald-500 flex flex-col overflow-hidden"
          style={{ 
            width: '380px', 
            height: '550px', 
            zIndex: 99999,
            position: 'relative'
          }}
        >
          {/* 头部 */}
          <div className="bg-emerald-600 text-white px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <span className="font-bold text-white">⚽</span>
              </div>
              <div>
                <div className="font-bold text-lg">足球AI小助手</div>
                <div className="text-xs text-white/80">专业解答足球相关问题</div>
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
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm">
                <div className="text-4xl mb-3">⚽</div>
                <p>嗨！我是你的足球AI助手</p>
                <p>有任何足球相关问题都可以问我~</p>
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
                  {msg.content}
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

          {/* 快捷提问 */}
          {messages.length === 0 && (
            <div className="p-3 bg-white border-t border-gray-200 grid grid-cols-2 gap-2">
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
          <div className="p-3 bg-white border-t border-gray-200 flex items-end gap-2">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 h-10 max-h-32"
              placeholder="请输入问题，按回车发送（Shift+Enter换行）"
              disabled={isLoading}
            />
            <button
              onClick={() => sendMessage(inputValue)}
              disabled={isLoading || !inputValue.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg transition-colors h-10"
            >
              发送
            </button>
          </div>
        </div>
      )}

      {/* 悬浮按钮 ✅ 修复：点击事件加调试，确保状态切换 */}
      <button
        onClick={() => {
          console.log("按钮被点击了");
          setIsOpen(prev => !prev);
        }}
        className="w-16 h-16 bg-emerald-600 hover:bg-emerald-700 rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-105 text-white"
        title="足球AI助手"
      >
        <span className="text-2xl">⚽</span>
      </button>
    </div>
  );
}