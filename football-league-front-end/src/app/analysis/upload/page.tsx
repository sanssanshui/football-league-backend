"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Upload, Film, CheckCircle } from "lucide-react";
import { useUserStore } from "@/lib/store";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5002";

const containerV = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.2 } },
} as const;
const itemV = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 120, damping: 16 } },
};

export default function VideoUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const router = useRouter();
  const { token } = useUserStore();

  const handleFile = useCallback((f: File | null) => {
    if (f && /\.(mp4|avi|mov)$/i.test(f.name)) {
      setFile(f);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    handleFile(f);
  }, [handleFile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    if (!token) {
      alert("请先登录");
      router.push("/auth");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("video", file);

    try {
      const res = await fetch(`${API}/api/analysis/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        router.push(`/analysis/result/${data.taskId}`);
      } else {
        alert(data.message || "上传失败");
      }
    } catch {
      alert("上传失败，请检查网络后重试");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden font-sans flex flex-col">
      <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/pk.jpg')" }} />
      <div className="fixed inset-0 z-0 bg-black/70" />

      <div className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,170,255,0.07) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,170,255,0.07) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
          maskImage: "linear-gradient(to top, rgba(0,170,255,0.4) 0%, transparent 55%)",
          WebkitMaskImage: "linear-gradient(to top, rgba(0,170,255,0.4) 0%, transparent 55%)",
        }} />

      <motion.div
        className="fixed left-0 right-0 h-px z-0 pointer-events-none"
        style={{ background: "linear-gradient(90deg, transparent, #00aaff66, transparent)" }}
        animate={{ top: ["10%", "90%", "10%"] }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      />

      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="relative z-20 flex items-center justify-between px-8 pt-8 pb-4">
        <button onClick={() => router.back()}
          className="flex items-center gap-2 px-5 py-2 rounded-full text-white/70 hover:text-white transition-all text-sm"
          style={{ background: "rgba(0,170,255,0.1)", border: "1px solid rgba(0,170,255,0.3)" }}>
          <ArrowLeft className="w-4 h-4" /> 返回
        </button>
        <div className="text-center">
          <div className="text-xs text-[#00aaff] tracking-[0.3em] uppercase mb-0.5">VIDEO ANALYSIS</div>
          <h1 className="text-white text-xl font-bold tracking-wide">足球比赛视频分析</h1>
        </div>
        <div className="w-24" />
      </motion.div>

      <motion.div
        variants={containerV} initial="hidden" animate="visible"
        className="relative z-10 flex-1 w-full max-w-[700px] mx-auto px-6 pb-10 flex flex-col gap-6"
      >
        <motion.form variants={itemV} onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className="relative rounded-2xl p-10 flex flex-col items-center gap-4 cursor-pointer transition-all duration-300"
            style={{
              background: "linear-gradient(135deg, rgba(0,20,60,0.85) 0%, rgba(0,10,40,0.9) 100%)",
              border: dragOver ? "2px solid #00aaff" : "2px dashed rgba(0,170,255,0.4)",
              boxShadow: dragOver ? "0 0 30px #00aaff44" : "0 0 18px #00aaff22, inset 0 0 20px #00aaff11",
            }}
            onClick={() => document.getElementById("video-upload")?.click()}
          >
            <span className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 rounded-tl-2xl border-[#00aaff]" />
            <span className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 rounded-tr-2xl border-[#00aaff]" />
            <span className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 rounded-bl-2xl border-[#00aaff]" />
            <span className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 rounded-br-2xl border-[#00aaff]" />

            <input
              type="file"
              accept="video/mp4,video/avi,video/mov,.mp4,.avi,.mov"
              onChange={(e) => handleFile(e.target.files?.[0] || null)}
              className="hidden"
              id="video-upload"
            />

            {file ? (
              <>
                <CheckCircle className="w-12 h-12 text-[#00ff88]" />
                <p className="text-white text-lg font-semibold">{file.name}</p>
                <p className="text-white/40 text-sm">
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                </p>
              </>
            ) : (
              <>
                <Upload className="w-12 h-12 text-[#00aaff]" />
                <p className="text-white text-lg font-semibold">点击或拖拽上传视频</p>
                <p className="text-white/40 text-sm">支持 MP4、AVI、MOV 格式</p>
              </>
            )}
          </div>

          <motion.button
            variants={itemV}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={!file || uploading}
            className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl text-black font-black text-lg tracking-widest disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: "linear-gradient(90deg, #00aaff, #00ddff, #7b61ff)",
              boxShadow: "0 0 30px rgba(0,170,255,0.6), 0 0 60px rgba(0,170,255,0.3)",
            }}
          >
            <Film className="w-5 h-5" />
            {uploading ? "上传分析中..." : "开始分析"}
          </motion.button>
        </motion.form>

        <motion.div variants={itemV} className="rounded-2xl p-6"
          style={{
            background: "linear-gradient(135deg, rgba(0,20,60,0.7) 0%, rgba(0,10,40,0.8) 100%)",
            border: "1px solid rgba(0,170,255,0.2)",
          }}>
          <h3 className="text-white/80 font-bold mb-3 flex items-center gap-2">
            <span className="text-lg">📋</span> 分析说明
          </h3>
          <ul className="text-white/50 text-sm space-y-2">
            <li>• 上传足球比赛视频后，系统将自动进行 AI 分析</li>
            <li>• 分析内容包括：球员检测、传球识别、跑动轨迹等</li>
            <li>• 分析时间取决于视频长度，通常需要 2-5 分钟</li>
            <li>• 分析完成后将生成可视化图表和数据报告</li>
          </ul>
        </motion.div>
      </motion.div>
    </div>
  );
}
