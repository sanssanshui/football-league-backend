"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, useAnimation } from "framer-motion";
import { ArrowLeft, Save, Share2, RotateCcw } from "lucide-react";
import { useUserStore } from "@/lib/store";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5002";

interface PlayerAbilities {
  speed_value: number;
  power_value: number;
  stamina_value: number;
  dribbling_value: number;
  passing_value: number;
  shooting_value: number;
  defending_value: number;
  vision_value: number;
}

interface PlayerAnalysis {
  abilities: PlayerAbilities;
  player_style: string;
  style_tags: string[];
  overall_rating: number;
  evaluation: string;
}

interface PlayerData {
  input: any;
  analysis: PlayerAnalysis;
}

const styleColors: Record<string, string> = {
  BALANCED: "#00ff88",
  SPEED: "#00ddff",
  POWER: "#ff6b35",
  TECHNICAL: "#7b61ff",
  STRIKER: "#ff4d6d",
  AMATEUR: "#ffd700",
};

const styleNames: Record<string, string> = {
  BALANCED: "全能均衡型",
  SPEED: "速度爆发型",
  POWER: "力量防守型",
  TECHNICAL: "技术组织型",
  STRIKER: "射门终结型",
  AMATEUR: "业余入门型",
};

function RadarChart({ abilities, color }: { abilities: PlayerAbilities; color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [progress, setProgress] = useState(0);

  const dimensions = [
    { key: "speed_value", label: "速度", angle: 0 },
    { key: "shooting_value", label: "射门", angle: Math.PI / 4 },
    { key: "passing_value", label: "传球", angle: Math.PI / 2 },
    { key: "dribbling_value", label: "盘带", angle: (3 * Math.PI) / 4 },
    { key: "vision_value", label: "视野", angle: Math.PI },
    { key: "defending_value", label: "防守", angle: (5 * Math.PI) / 4 },
    { key: "stamina_value", label: "耐力", angle: (3 * Math.PI) / 2 },
    { key: "power_value", label: "力量", angle: (7 * Math.PI) / 4 },
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const maxRadius = Math.min(centerX, centerY) - 60;

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制背景网格
    ctx.strokeStyle = "rgba(0, 170, 255, 0.15)";
    ctx.lineWidth = 1;
    for (let i = 1; i <= 5; i++) {
      ctx.beginPath();
      const radius = (maxRadius * i) / 5;
      for (let j = 0; j < dimensions.length; j++) {
        const angle = dimensions[j].angle - Math.PI / 2;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        if (j === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }

    // 绘制轴线
    ctx.strokeStyle = "rgba(0, 170, 255, 0.2)";
    ctx.lineWidth = 1;
    dimensions.forEach((dim) => {
      ctx.beginPath();
      const angle = dim.angle - Math.PI / 2;
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + maxRadius * Math.cos(angle),
        centerY + maxRadius * Math.sin(angle)
      );
      ctx.stroke();
    });

    // 绘制数据区域（带动画）
    if (progress > 0) {
      ctx.beginPath();
      dimensions.forEach((dim, i) => {
        const value = abilities[dim.key as keyof PlayerAbilities];
        const radius = (maxRadius * value * progress) / 100;
        const angle = dim.angle - Math.PI / 2;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();

      // 填充
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius);
      gradient.addColorStop(0, `${color}40`);
      gradient.addColorStop(1, `${color}10`);
      ctx.fillStyle = gradient;
      ctx.fill();

      // 边框
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // 绘制标签和数值
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    dimensions.forEach((dim) => {
      const value = abilities[dim.key as keyof PlayerAbilities];
      const angle = dim.angle - Math.PI / 2;
      const labelRadius = maxRadius + 35;
      const x = centerX + labelRadius * Math.cos(angle);
      const y = centerY + labelRadius * Math.sin(angle);

      // 标签
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      ctx.fillText(dim.label, x, y);

      // 数值
      if (progress > 0) {
        ctx.font = "bold 16px sans-serif";
        ctx.fillStyle = color;
        const animatedValue = Math.round(value * progress);
        ctx.fillText(animatedValue.toString(), x, y + 18);
        ctx.font = "bold 14px sans-serif";
      }
    });
  }, [abilities, progress, color, dimensions]);

  useEffect(() => {
    let frame = 0;
    const animate = () => {
      frame++;
      const newProgress = Math.min(frame / 60, 1); // 60帧动画
      setProgress(newProgress);
      if (newProgress < 1) {
        requestAnimationFrame(animate);
      }
    };
    const timer = setTimeout(() => {
      requestAnimationFrame(animate);
    }, 800); // 画像动画后延迟触发

    return () => clearTimeout(timer);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={600}
      className="w-full h-full max-w-[600px] max-h-[600px]"
    />
  );
}

function PlayerPortrait({ data, color }: { data: PlayerData; color: string }) {
  const { input, analysis } = data;
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 10;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 10;
    setHoverPos({ x, y });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 1.2, ease: "easeOut" }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative w-full max-w-[800px] mx-auto rounded-3xl overflow-hidden cursor-pointer"
      style={{
        aspectRatio: "16/9",
        background: `linear-gradient(135deg, rgba(0,20,60,0.95) 0%, rgba(0,10,40,0.98) 100%)`,
        border: `2px solid ${color}`,
        boxShadow: `0 0 40px ${color}66, inset 0 0 60px ${color}22`,
        transform: isHovered ? `perspective(1000px) rotateX(${-hoverPos.y}deg) rotateY(${hoverPos.x}deg) scale(1.05)` : "none",
        transition: "transform 0.3s ease-out",
      }}
    >
      {/* 呼吸光效 */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${color}33 0%, transparent 70%)`,
        }}
        animate={{
          opacity: [0.3, 0.6, 0.3],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* 内容 */}
      <div className="relative z-10 h-full flex flex-col justify-between p-8">
        {/* 顶部信息 */}
        <div className="flex justify-between items-start">
          <div>
            <div className="text-xs text-white/40 tracking-widest uppercase mb-1">Player Profile</div>
            <h2 className="text-4xl font-black text-white mb-2">
              {input.gender === "男" ? "⚽" : "🏃‍♀️"} {styleNames[analysis.player_style]}
            </h2>
            <div className="flex gap-2">
              {analysis.style_tags.map((tag: string, i: number) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded-full text-xs font-bold"
                  style={{
                    background: `${color}33`,
                    color: color,
                    border: `1px solid ${color}`,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="text-right">
            <div className="text-6xl font-black" style={{ color }}>
              {analysis.overall_rating}
            </div>
            <div className="text-sm text-white/50">总评</div>
          </div>
        </div>

        {/* 中部身体数据 */}
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{input.height}cm</div>
            <div className="text-xs text-white/40">身高</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{input.weight}kg</div>
            <div className="text-xs text-white/40">体重</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{input.age}岁</div>
            <div className="text-xs text-white/40">年龄</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{input.preferred_foot}</div>
            <div className="text-xs text-white/40">惯用脚</div>
          </div>
        </div>

        {/* 底部位置信息 */}
        <div>
          <div className="text-xs text-white/40 mb-2">擅长位置</div>
          <div className="flex flex-wrap gap-2">
            {input.positions.map((pos: string, i: number) => (
              <span
                key={i}
                className="px-4 py-1.5 rounded-lg text-sm font-semibold"
                style={{
                  background: `${color}22`,
                  color: "white",
                  border: `1px solid ${color}66`,
                }}
              >
                {pos}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 装饰元素 */}
      <div className="absolute top-0 left-0 w-20 h-20 border-t-4 border-l-4 rounded-tl-3xl" style={{ borderColor: color }} />
      <div className="absolute top-0 right-0 w-20 h-20 border-t-4 border-r-4 rounded-tr-3xl" style={{ borderColor: color }} />
      <div className="absolute bottom-0 left-0 w-20 h-20 border-b-4 border-l-4 rounded-bl-3xl" style={{ borderColor: color }} />
      <div className="absolute bottom-0 right-0 w-20 h-20 border-b-4 border-r-4 rounded-br-3xl" style={{ borderColor: color }} />
    </motion.div>
  );
}

export default function PlayerProfileResultPage() {
  const router = useRouter();
  const { token } = useUserStore();
  const [data, setData] = useState<PlayerData | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("playerAnalysis");
    if (!stored) {
      router.push("/player-profile");
      return;
    }
    setData(JSON.parse(stored));
  }, [router]);

  if (!data) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">加载中...</div>
      </div>
    );
  }

  const color = styleColors[data.analysis.player_style] || "#00aaff";

  const handleSave = async () => {
    if (!token) {
      alert("请先登录");
      router.push("/auth");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API}/api/player-profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data.input),
      });

      const json = await res.json();
      if (json.code === 200) {
        alert("保存成功！");
        router.push("/profile");
      } else {
        alert(json.message || "保存失败");
      }
    } catch (e) {
      console.error(e);
      alert("网络错误");
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = () => {
    router.push("/player-profile");
  };

  const handleShare = () => {
    alert("分享功能开发中...");
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden font-sans">
      {/* Background */}
      <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/pk.jpg')" }} />
      <div className="fixed inset-0 z-0 bg-black/80" />

      {/* Grid overlay */}
      <div className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,170,255,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,170,255,0.05) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }} />

      {/* Top bar */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-20 flex items-center justify-between px-8 pt-8 pb-4"
      >
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-5 py-2 rounded-full text-white/70 hover:text-white transition-all text-sm"
          style={{ background: "rgba(0,170,255,0.1)", border: "1px solid rgba(0,170,255,0.3)" }}
        >
          <ArrowLeft className="w-4 h-4" /> 返回
        </button>
        <div className="text-center">
          <div className="text-xs text-[#00aaff] tracking-[0.3em] uppercase mb-0.5">苏超模拟赛场</div>
          <h1 className="text-white text-xl font-bold tracking-wide">球员数值分析结果</h1>
        </div>
        <div className="w-24" />
      </motion.div>

      {/* Content */}
      <div className="relative z-10 max-w-[1400px] mx-auto px-6 py-8 space-y-12">
        {/* 球员画像 */}
        <PlayerPortrait data={data} color={color} />

        {/* 雷达图和信息 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 雷达图 */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="flex items-center justify-center"
          >
            <RadarChart abilities={data.analysis.abilities} color={color} />
          </motion.div>

          {/* 信息模块 */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7, duration: 0.8 }}
            className="flex flex-col justify-center space-y-6"
          >
            {/* 风格标签 */}
            <div
              className="rounded-2xl p-6"
              style={{
                background: "linear-gradient(135deg, rgba(0,20,60,0.85) 0%, rgba(0,10,40,0.9) 100%)",
                border: `1px solid ${color}55`,
                boxShadow: `0 0 20px ${color}33`,
              }}
            >
              <h3 className="text-white/70 text-sm font-medium mb-3">球员风格</h3>
              <div className="text-3xl font-black mb-4" style={{ color }}>
                {styleNames[data.analysis.player_style]}
              </div>
              <div className="flex flex-wrap gap-2">
                {data.analysis.style_tags.map((tag: string, i: number) => (
                  <span
                    key={i}
                    className="px-4 py-2 rounded-lg text-sm font-bold"
                    style={{
                      background: `${color}33`,
                      color: color,
                      border: `1px solid ${color}`,
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* 评语 */}
            <div
              className="rounded-2xl p-6"
              style={{
                background: "linear-gradient(135deg, rgba(0,20,60,0.85) 0%, rgba(0,10,40,0.9) 100%)",
                border: `1px solid ${color}55`,
                boxShadow: `0 0 20px ${color}33`,
              }}
            >
              <h3 className="text-white/70 text-sm font-medium mb-3">专业评语</h3>
              <p className="text-white/90 text-base leading-relaxed">
                {data.analysis.evaluation}
              </p>
            </div>

            {/* 能力数值列表 */}
            <div
              className="rounded-2xl p-6"
              style={{
                background: "linear-gradient(135deg, rgba(0,20,60,0.85) 0%, rgba(0,10,40,0.9) 100%)",
                border: `1px solid ${color}55`,
                boxShadow: `0 0 20px ${color}33`,
              }}
            >
              <h3 className="text-white/70 text-sm font-medium mb-3">详细数值</h3>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(data.analysis.abilities).map(([key, value]) => {
                  const labels: Record<string, string> = {
                    speed_value: "速度",
                    power_value: "力量",
                    stamina_value: "耐力",
                    dribbling_value: "盘带",
                    passing_value: "传球",
                    shooting_value: "射门",
                    defending_value: "防守",
                    vision_value: "视野",
                  };
                  return (
                    <div key={key} className="flex justify-between items-center">
                      <span className="text-white/60 text-sm">{labels[key]}</span>
                      <span className="text-xl font-bold" style={{ color }}>
                        {value}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>

        {/* 操作按钮 */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.6 }}
          className="flex justify-center gap-4 pb-12"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleRegenerate}
            className="flex items-center gap-2 px-8 py-3 rounded-xl text-white font-bold"
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.3)",
            }}
          >
            <RotateCcw className="w-4 h-4" />
            重新生成
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-8 py-3 rounded-xl text-black font-bold disabled:opacity-50"
            style={{
              background: `linear-gradient(90deg, ${color}, ${color}dd)`,
              boxShadow: `0 0 20px ${color}66`,
            }}
          >
            <Save className="w-4 h-4" />
            {saving ? "保存中..." : "保存档案"}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleShare}
            className="flex items-center gap-2 px-8 py-3 rounded-xl text-white font-bold"
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.3)",
            }}
          >
            <Share2 className="w-4 h-4" />
            分享
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}
