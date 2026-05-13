"use client";

import { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, XCircle, Users, GitBranch, Video } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5002";

interface TaskResult {
  id: string;
  videoName: string;
  status: string;
  totalPlayers?: number;
  passCount?: number;
  resultJson?: string;
  createdAt?: string;
  completedAt?: string;
}

interface ProgressData {
  stage: string;
  percent: number;
  message: string;
}

const containerV = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.2 } },
} as const;
const itemV = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 120, damping: 16 } },
};

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <motion.div variants={itemV} className="relative rounded-2xl p-5 flex flex-col gap-2 overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(0,20,60,0.85) 0%, rgba(0,10,40,0.9) 100%)",
        border: `1px solid ${color}55`,
        boxShadow: `0 0 18px ${color}33, inset 0 0 20px ${color}11`,
      }}>
      <span className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 rounded-tl-2xl" style={{ borderColor: color }} />
      <span className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 rounded-tr-2xl" style={{ borderColor: color }} />
      <span className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 rounded-bl-2xl" style={{ borderColor: color }} />
      <span className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 rounded-br-2xl" style={{ borderColor: color }} />
      <div className="flex items-center gap-2 text-white/60 text-sm">{icon}<span>{label}</span></div>
      <div className="text-3xl font-black" style={{ color }}>{value}</div>
    </motion.div>
  );
}

export default function AnalysisResultPage({ params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = use(params);
  const [task, setTask] = useState<TaskResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<ProgressData>({ stage: "pending", percent: 0, message: "等待开始..." });
  const [liveFrameKey, setLiveFrameKey] = useState(0);
  const [startTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const router = useRouter();
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchTask = async () => {
      try {
        const res = await fetch(`${API}/api/analysis/task/${taskId}`);
        const data = await res.json();
        if (cancelled) return;
        if (data.success) {
          setTask(data.data);
          if (data.data.status === "pending" || data.data.status === "processing") {
            setTimeout(fetchTask, 3000);
          }
        }
      } catch { /* ignore */ }
      finally { if (!cancelled) setLoading(false); }
    };

    fetchTask();
    return () => { cancelled = true; };
  }, [taskId]);

  useEffect(() => {
    if (!task || (task.status !== "pending" && task.status !== "processing")) {
      if (progressTimer.current) clearInterval(progressTimer.current);
      return;
    }

    const fetchProgress = async () => {
      try {
        const res = await fetch(`${API}/api/analysis/progress/${taskId}`);
        const data = await res.json();
        if (data.success && data.data) {
          setProgress(data.data);
        }
      } catch { /* ignore */ }
      setLiveFrameKey(Date.now());
    };

    fetchProgress();
    progressTimer.current = setInterval(fetchProgress, 2000);
    return () => { if (progressTimer.current) clearInterval(progressTimer.current); };
  }, [task?.status, taskId]);

  useEffect(() => {
    if (task?.status === "completed" || task?.status === "failed") return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(t);
  }, [task?.status, startTime]);

  if (loading) {
    return (
      <div className="relative min-h-screen flex items-center justify-center">
        <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/images/pk.jpg')" }} />
        <div className="fixed inset-0 z-0 bg-black/70" />
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10 flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-[#00aaff] animate-spin" />
          <p className="text-white/60">加载中...</p>
        </motion.div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="relative min-h-screen flex items-center justify-center">
        <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/images/pk.jpg')" }} />
        <div className="fixed inset-0 z-0 bg-black/70" />
        <div className="relative z-10 text-center">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-white text-xl font-bold">任务不存在</p>
        </div>
      </div>
    );
  }

  const result = task.resultJson ? JSON.parse(task.resultJson) : null;

  const chartUrl = (path: string) => {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    return `${API}${path}`;
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden font-sans flex flex-col">
      <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/images/pk.jpg')" }} />
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

      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="relative z-20 flex items-center justify-between px-8 pt-8 pb-4">
        <button onClick={() => router.push("/analysis/upload")}
          className="flex items-center gap-2 px-5 py-2 rounded-full text-white/70 hover:text-white transition-all text-sm"
          style={{ background: "rgba(0,170,255,0.1)", border: "1px solid rgba(0,170,255,0.3)" }}>
          <ArrowLeft className="w-4 h-4" /> 返回上传
        </button>
        <div className="text-center">
          <div className="text-xs text-[#00aaff] tracking-[0.3em] uppercase mb-0.5">ANALYSIS RESULT</div>
          <h1 className="text-white text-xl font-bold tracking-wide">{task.videoName}</h1>
        </div>
        <div className="w-24" />
      </motion.div>

      {(task.status === "pending" || task.status === "processing") && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="relative z-10 flex-1 w-full max-w-[900px] mx-auto px-6 pb-20 flex flex-col items-center gap-6 pt-8">

          {/* Live Detection Frame */}
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="w-full rounded-2xl overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(0,20,60,0.85) 0%, rgba(0,10,40,0.9) 100%)",
              border: "1px solid rgba(0,170,255,0.3)",
              boxShadow: "0 0 30px rgba(0,170,255,0.15)",
            }}>
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
              <Video className="w-4 h-4 text-[#00aaff]" />
              <span className="text-white/70 text-sm font-medium">实时检测画面</span>
              <span className="ml-auto flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-white/40 text-xs">LIVE</span>
              </span>
            </div>
            {liveFrameKey > 0 ? (
              <img
                key={liveFrameKey}
                src={`${API}/api/analysis/file/${taskId}/preview?t=${liveFrameKey}`}
                alt="YOLO Detection"
                className="w-full block"
                onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0'; }}
                onLoad={(e) => { (e.target as HTMLImageElement).style.opacity = '1'; }}
                style={{ minHeight: "200px", background: "rgba(0,0,0,0.3)", transition: "opacity 0.3s" }}
              />
            ) : (
              <div className="flex items-center justify-center h-48 text-white/30 text-sm">
                等待第一帧检测结果...
              </div>
            )}
          </motion.div>

          {/* Progress Info */}
          <div className="w-full rounded-2xl p-6"
            style={{
              background: "linear-gradient(135deg, rgba(0,20,60,0.85) 0%, rgba(0,10,40,0.9) 100%)",
              border: "1px solid rgba(0,170,255,0.3)",
            }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-white font-bold">{progress.message || "视频正在分析中..."}</p>
              <span className="text-[#00aaff] font-mono text-lg font-bold">{progress.percent}%</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: "rgba(0,170,255,0.15)" }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, #00aaff, #00ddff)" }}
                initial={{ width: 0 }}
                animate={{ width: `${progress.percent}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>

            {/* Time Estimate */}
            <div className="flex items-center justify-between mt-3 text-white/40 text-xs">
              <span>已用时 {elapsed}s</span>
              <span>
                {progress.percent > 5
                  ? `预计剩余 ${Math.max(1, Math.round((elapsed / progress.percent) * (100 - progress.percent)))}s`
                  : "正在估算剩余时间..."}
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {task.status === "failed" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="relative z-10 flex-1 flex flex-col items-center justify-center gap-6 pb-20">
          <XCircle className="w-16 h-16 text-red-400" />
          <p className="text-white text-xl font-bold">分析失败</p>
          <p className="text-white/40 text-sm">请检查视频格式是否正确，或重新上传</p>
          <button onClick={() => router.push("/analysis/upload")}
            className="mt-4 px-8 py-3 rounded-xl text-black font-bold"
            style={{ background: "linear-gradient(90deg, #00aaff, #00ddff)" }}>
            重新上传
          </button>
        </motion.div>
      )}

      {task.status === "completed" && (
        <motion.div variants={containerV} initial="hidden" animate="visible"
          className="relative z-10 flex-1 w-full max-w-[1100px] mx-auto px-6 pb-10 flex flex-col gap-6">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <StatCard icon={<Users className="w-4 h-4" />} label="场上球员" value={task.totalPlayers ?? "-"} color="#00aaff" />
            <StatCard icon={<GitBranch className="w-4 h-4" />} label="检测到传球次数" value={task.passCount ?? "-"} color="#00ff88" />
          </div>

          {result?.charts && (
            <>
              <motion.h2 variants={itemV} className="text-white text-lg font-bold mt-4 flex items-center gap-2">
                <span className="text-xl">📊</span> 分析图表
              </motion.h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {result.charts.team_metrics && (
                  <motion.div variants={itemV} className="rounded-2xl p-4 overflow-hidden"
                    style={{
                      background: "linear-gradient(135deg, rgba(0,20,60,0.85) 0%, rgba(0,10,40,0.9) 100%)",
                      border: "1px solid rgba(0,170,255,0.3)",
                    }}>
                    <h3 className="text-white/70 text-sm font-bold mb-3">团队核心指标对比</h3>
                    <img src={chartUrl(result.charts.team_metrics)} alt="团队指标" className="w-full rounded-lg" />
                  </motion.div>
                )}
                {result.charts.team_radar && (
                  <motion.div variants={itemV} className="rounded-2xl p-4 overflow-hidden"
                    style={{
                      background: "linear-gradient(135deg, rgba(0,20,60,0.85) 0%, rgba(0,10,40,0.9) 100%)",
                      border: "1px solid rgba(0,170,255,0.3)",
                    }}>
                    <h3 className="text-white/70 text-sm font-bold mb-3">团队能力雷达图</h3>
                    <img src={chartUrl(result.charts.team_radar)} alt="雷达图" className="w-full rounded-lg" />
                  </motion.div>
                )}
                {result.charts.pass_network && (
                  <motion.div variants={itemV} className="rounded-2xl p-4 overflow-hidden"
                    style={{
                      background: "linear-gradient(135deg, rgba(0,20,60,0.85) 0%, rgba(0,10,40,0.9) 100%)",
                      border: "1px solid rgba(0,170,255,0.3)",
                    }}>
                    <h3 className="text-white/70 text-sm font-bold mb-3">传球网络分析</h3>
                    {(task.passCount ?? 0) > 0 ? (
                      <img src={chartUrl(result.charts.pass_network)} alt="传球网络" className="w-full rounded-lg" />
                    ) : (
                      <div className="flex items-center justify-center h-40 text-white/40 text-sm">
                        未检测到传球
                      </div>
                    )}
                  </motion.div>
                )}
                {result.charts.heatmap && (
                  <motion.div variants={itemV} className="rounded-2xl p-4 overflow-hidden"
                    style={{
                      background: "linear-gradient(135deg, rgba(0,20,60,0.85) 0%, rgba(0,10,40,0.9) 100%)",
                      border: "1px solid rgba(0,170,255,0.3)",
                    }}>
                    <h3 className="text-white/70 text-sm font-bold mb-3">球员热力图</h3>
                    <img src={chartUrl(result.charts.heatmap)} alt="热力图" className="w-full rounded-lg" />
                  </motion.div>
                )}
              </div>
            </>
          )}

          <motion.div variants={itemV} className="flex justify-center mt-6">
            <button onClick={() => router.push("/analysis/upload")}
              className="px-8 py-3 rounded-xl text-sm font-bold text-white/70 hover:text-white transition-all"
              style={{ background: "rgba(0,170,255,0.1)", border: "1px solid rgba(0,170,255,0.3)" }}>
              上传新视频
            </button>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
