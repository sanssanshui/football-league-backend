"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Zap } from "lucide-react";
import { useUserStore } from "@/lib/store";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5002";

const containerV = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.15 } },
};
const cardV = {
  hidden: { opacity: 0, y: 40, scale: 0.92 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 120, damping: 16 } },
};

function SliderCard({
  label, icon, unit, min, max, step = 1, value, onChange, color = "#00aaff",
}: {
  label: string; icon: string; unit: string; min: number; max: number;
  step?: number; value: number; onChange: (v: number) => void; color?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <motion.div
      variants={cardV}
      whileHover={{ scale: 1.03, filter: "brightness(1.15)" }}
      className="relative rounded-2xl p-5 flex flex-col gap-3 cursor-default overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(0,20,60,0.85) 0%, rgba(0,10,40,0.9) 100%)",
        border: `1px solid ${color}55`,
        boxShadow: `0 0 18px ${color}33, inset 0 0 20px ${color}11`,
      }}
    >
      <span className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 rounded-tl-2xl" style={{ borderColor: color }} />
      <span className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 rounded-tr-2xl" style={{ borderColor: color }} />
      <span className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 rounded-bl-2xl" style={{ borderColor: color }} />
      <span className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 rounded-br-2xl" style={{ borderColor: color }} />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{icon}</span>
          <span className="text-white/70 text-sm font-medium tracking-wide">{label}</span>
        </div>
        <motion.span
          key={value}
          initial={{ scale: 1.3, opacity: 0.6 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-2xl font-black"
          style={{ color }}
        >
          {value}<span className="text-sm font-normal text-white/40 ml-1">{unit}</span>
        </motion.span>
      </div>

      <div className="relative h-2 rounded-full bg-white/10">
        <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-150"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}88, ${color})`, boxShadow: `0 0 8px ${color}` }} />
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
        />
      </div>
      <div className="flex justify-between text-[10px] text-white/20">
        <span>{min}{unit}</span><span>{max}{unit}</span>
      </div>
    </motion.div>
  );
}

function SelectCard({
  label, icon, options, value, onChange, color = "#00aaff",
}: {
  label: string; icon: string; options: string[]; value: string;
  onChange: (v: string) => void; color?: string;
}) {
  return (
    <motion.div
      variants={cardV}
      whileHover={{ scale: 1.03, filter: "brightness(1.15)" }}
      className="relative rounded-2xl p-5 flex flex-col gap-3 overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(0,20,60,0.85) 0%, rgba(0,10,40,0.9) 100%)",
        border: `1px solid ${color}55`,
        boxShadow: `0 0 18px ${color}33, inset 0 0 20px ${color}11`,
      }}
    >
      <span className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 rounded-tl-2xl" style={{ borderColor: color }} />
      <span className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 rounded-tr-2xl" style={{ borderColor: color }} />
      <span className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 rounded-bl-2xl" style={{ borderColor: color }} />
      <span className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 rounded-br-2xl" style={{ borderColor: color }} />

      <div className="flex items-center gap-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-white/70 text-sm font-medium tracking-wide">{label}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button key={opt} onClick={() => onChange(opt)}
            className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200"
            style={value === opt
              ? { background: color, color: '#000', boxShadow: `0 0 12px ${color}` }
              : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: `1px solid ${color}33` }
            }>
            {opt}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

function MultiSelectCard({
  label, icon, options, value, onChange, color = "#00aaff",
}: {
  label: string; icon: string; options: string[]; value: string[];
  onChange: (v: string[]) => void; color?: string;
}) {
  const toggle = (opt: string) => {
    if (value.includes(opt)) {
      onChange(value.filter(v => v !== opt));
    } else {
      onChange([...value, opt]);
    }
  };

  return (
    <motion.div
      variants={cardV}
      whileHover={{ scale: 1.03, filter: "brightness(1.15)" }}
      className="relative rounded-2xl p-5 flex flex-col gap-3 overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(0,20,60,0.85) 0%, rgba(0,10,40,0.9) 100%)",
        border: `1px solid ${color}55`,
        boxShadow: `0 0 18px ${color}33, inset 0 0 20px ${color}11`,
      }}
    >
      <span className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 rounded-tl-2xl" style={{ borderColor: color }} />
      <span className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 rounded-tr-2xl" style={{ borderColor: color }} />
      <span className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 rounded-bl-2xl" style={{ borderColor: color }} />
      <span className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 rounded-br-2xl" style={{ borderColor: color }} />

      <div className="flex items-center gap-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-white/70 text-sm font-medium tracking-wide">{label}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button key={opt} onClick={() => toggle(opt)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200"
            style={value.includes(opt)
              ? { background: color, color: '#000', boxShadow: `0 0 12px ${color}` }
              : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: `1px solid ${color}33` }
            }>
            {opt}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

function RatingCard({
  label, icon, value, onChange, color = "#00aaff",
}: {
  label: string; icon: string; value: number;
  onChange: (v: number) => void; color?: string;
}) {
  return (
    <motion.div
      variants={cardV}
      whileHover={{ scale: 1.03, filter: "brightness(1.15)" }}
      className="relative rounded-2xl p-5 flex flex-col gap-3 overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(0,20,60,0.85) 0%, rgba(0,10,40,0.9) 100%)",
        border: `1px solid ${color}55`,
        boxShadow: `0 0 18px ${color}33, inset 0 0 20px ${color}11`,
      }}
    >
      <span className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 rounded-tl-2xl" style={{ borderColor: color }} />
      <span className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 rounded-tr-2xl" style={{ borderColor: color }} />
      <span className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 rounded-bl-2xl" style={{ borderColor: color }} />
      <span className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 rounded-br-2xl" style={{ borderColor: color }} />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{icon}</span>
          <span className="text-white/70 text-sm font-medium tracking-wide">{label}</span>
        </div>
        <motion.span
          key={value}
          initial={{ scale: 1.3, opacity: 0.6 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-2xl font-black"
          style={{ color }}
        >
          {value}<span className="text-sm font-normal text-white/40 ml-1">/10</span>
        </motion.span>
      </div>

      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className="flex-1 h-8 rounded-lg transition-all duration-200"
            style={n <= value
              ? { background: color, boxShadow: `0 0 8px ${color}` }
              : { background: 'rgba(255,255,255,0.06)', border: `1px solid ${color}33` }
            }
          />
        ))}
      </div>
    </motion.div>
  );
}

export default function PlayerProfileInputPage() {
  const router = useRouter();
  const { token } = useUserStore();
  const [generating, setGenerating] = useState(false);

  const [form, setForm] = useState({
    // 基础身体属性
    height: 175,
    weight: 70,
    age: 25,
    gender: "男",
    blood_type: "A",
    body_fat_rate: 15,
    preferred_foot: "右脚",
    positions: ["中场"] as string[],

    // 心肺与耐力属性
    resting_heart_rate: 70,
    max_heart_rate: 180,
    lung_capacity: 4000,
    endurance_rating: 5,
    weekly_exercise_count: 3,
    avg_exercise_duration: 60,
    football_years: 5,

    // 力量与爆发属性
    squat_max: 80,
    bench_press_max: 60,
    core_strength_rating: 5,
    explosive_rating: 5,

    // 足球技术属性
    dribbling_rating: 5,
    passing_rating: 5,
    shooting_rating: 5,
    defending_rating: 5,
    vision_rating: 5,
  });

  const set = (k: keyof typeof form) => (v: number | string | string[]) =>
    setForm(p => ({ ...p, [k]: v }));

  const handleGenerate = async () => {
    if (!token) {
      alert("请先登录");
      router.push("/auth");
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch(`${API}/api/player-profile/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const json = await res.json();
      if (json.code === 200) {
        // 跳转到结果页面，传递分析数据
        sessionStorage.setItem("playerAnalysis", JSON.stringify({ input: form, analysis: json.data }));
        router.push("/player-profile/result");
      } else {
        alert(json.message || "生成失败");
      }
    } catch (e) {
      console.error(e);
      alert("网络错误");
    } finally {
      setGenerating(false);
    }
  };

  const bmi = (form.weight / ((form.height / 100) ** 2)).toFixed(1);

  return (
    <div className="relative min-h-screen overflow-x-hidden font-sans flex flex-col">
      {/* Background */}
      <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/pk.jpg')" }} />
      <div className="fixed inset-0 z-0 bg-black/70" />

      {/* Grid floor overlay */}
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

      {/* Scan line */}
      <motion.div
        className="fixed left-0 right-0 h-px z-0 pointer-events-none"
        style={{ background: "linear-gradient(90deg, transparent, #00aaff66, transparent)" }}
        animate={{ top: ["10%", "90%", "10%"] }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      />

      {/* Top bar */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="relative z-20 flex items-center justify-between px-8 pt-8 pb-4">
        <button onClick={() => router.back()}
          className="flex items-center gap-2 px-5 py-2 rounded-full text-white/70 hover:text-white transition-all text-sm"
          style={{ background: "rgba(0,170,255,0.1)", border: "1px solid rgba(0,170,255,0.3)" }}>
          <ArrowLeft className="w-4 h-4" /> 返回
        </button>
        <div className="text-center">
          <div className="text-xs text-[#00aaff] tracking-[0.3em] uppercase mb-0.5">苏超模拟赛场</div>
          <h1 className="text-white text-xl font-bold tracking-wide">个人体能数据录入</h1>
        </div>
        <div className="w-24" />
      </motion.div>

      {/* Cards grid */}
      <motion.div
        variants={containerV} initial="hidden" animate="visible"
        className="relative z-10 flex-1 w-full max-w-[1200px] mx-auto px-6 pb-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 content-start"
      >
        {/* 基础身体属性 */}
        <div className="col-span-full">
          <h2 className="text-white/80 text-lg font-bold mb-3 flex items-center gap-2">
            <span className="text-2xl">🏃</span> 基础身体属性
          </h2>
        </div>

        <SliderCard label="身高" icon="📏" unit="cm" min={140} max={220} value={form.height} onChange={set("height")} color="#00aaff" />
        <SliderCard label="体重" icon="⚖️" unit="kg" min={40} max={150} value={form.weight} onChange={set("weight")} color="#00ddff" />
        <SliderCard label="年龄" icon="🎂" unit="岁" min={10} max={60} value={form.age} onChange={set("age")} color="#7b61ff" />

        <SelectCard label="性别" icon="👤" options={["男", "女"]} value={form.gender} onChange={set("gender")} color="#00aaff" />
        <SelectCard label="血型" icon="🩸" options={["A", "B", "AB", "O"]} value={form.blood_type} onChange={set("blood_type")} color="#ff6b35" />
        <SliderCard label="体脂率" icon="💪" unit="%" min={5} max={30} step={0.5} value={form.body_fat_rate} onChange={set("body_fat_rate")} color="#ff4d6d" />

        <motion.div variants={cardV} className="relative rounded-2xl p-5 flex flex-col gap-2"
          style={{
            background: "linear-gradient(135deg, rgba(0,20,60,0.85) 0%, rgba(0,10,40,0.9) 100%)",
            border: "1px solid #00aaff55",
            boxShadow: "0 0 18px #00aaff33, inset 0 0 20px #00aaff11",
          }}>
          <div className="flex items-center gap-2">
            <span className="text-2xl">📊</span>
            <span className="text-white/70 text-sm font-medium">BMI（自动计算）</span>
          </div>
          <div className="text-3xl font-black text-[#00aaff]">{bmi}</div>
          <div className="text-xs text-white/40">
            {parseFloat(bmi) < 18.5 ? "偏瘦" : parseFloat(bmi) < 24 ? "正常" : parseFloat(bmi) < 28 ? "偏胖" : "肥胖"}
          </div>
        </motion.div>

        <SelectCard label="惯用脚" icon="👟" options={["左脚", "右脚", "双足"]} value={form.preferred_foot} onChange={set("preferred_foot")} color="#00ff88" />
        <MultiSelectCard label="场上位置" icon="⚽" options={["门将", "左后卫", "中后卫", "右后卫", "后腰", "中场", "前腰", "边锋", "前锋"]} value={form.positions} onChange={set("positions")} color="#ffd700" />

        {/* 心肺与耐力属性 */}
        <div className="col-span-full mt-6">
          <h2 className="text-white/80 text-lg font-bold mb-3 flex items-center gap-2">
            <span className="text-2xl">❤️</span> 心肺与耐力属性
          </h2>
        </div>

        <SliderCard label="静息心率" icon="💓" unit="bpm" min={40} max={120} value={form.resting_heart_rate} onChange={set("resting_heart_rate")} color="#ff4d6d" />
        <SliderCard label="最大心率" icon="💗" unit="bpm" min={140} max={220} value={form.max_heart_rate} onChange={set("max_heart_rate")} color="#ff6b9d" />
        <SliderCard label="肺活量" icon="🫁" unit="ml" min={2000} max={6000} step={100} value={form.lung_capacity} onChange={set("lung_capacity")} color="#00ddff" />
        <RatingCard label="耐力自评" icon="🏃‍♂️" value={form.endurance_rating} onChange={set("endurance_rating")} color="#00ff88" />
        <SliderCard label="每周运动次数" icon="📅" unit="次" min={0} max={14} value={form.weekly_exercise_count} onChange={set("weekly_exercise_count")} color="#00ff88" />
        <SliderCard label="平均运动时长" icon="⏱️" unit="分钟" min={10} max={180} step={5} value={form.avg_exercise_duration} onChange={set("avg_exercise_duration")} color="#ffd700" />
        <SliderCard label="球龄" icon="⚽" unit="年" min={0} max={30} value={form.football_years} onChange={set("football_years")} color="#7b61ff" />

        {/* 力量与爆发属性 */}
        <div className="col-span-full mt-6">
          <h2 className="text-white/80 text-lg font-bold mb-3 flex items-center gap-2">
            <span className="text-2xl">💪</span> 力量与爆发属性
          </h2>
        </div>

        <SliderCard label="深蹲最大重量" icon="🏋️" unit="kg" min={20} max={200} step={5} value={form.squat_max} onChange={set("squat_max")} color="#ff6b35" />
        <SliderCard label="卧推最大重量" icon="🏋️‍♂️" unit="kg" min={20} max={150} step={5} value={form.bench_press_max} onChange={set("bench_press_max")} color="#ff8c42" />
        <RatingCard label="核心力量自评" icon="🔥" value={form.core_strength_rating} onChange={set("core_strength_rating")} color="#ff4d6d" />
        <RatingCard label="爆发力自评" icon="⚡" value={form.explosive_rating} onChange={set("explosive_rating")} color="#ffd700" />

        {/* 足球技术属性 */}
        <div className="col-span-full mt-6">
          <h2 className="text-white/80 text-lg font-bold mb-3 flex items-center gap-2">
            <span className="text-2xl">⚽</span> 足球技术属性
          </h2>
        </div>

        <RatingCard label="盘带自评" icon="🏃‍♂️" value={form.dribbling_rating} onChange={set("dribbling_rating")} color="#00aaff" />
        <RatingCard label="传球自评" icon="🎯" value={form.passing_rating} onChange={set("passing_rating")} color="#00ddff" />
        <RatingCard label="射门自评" icon="🥅" value={form.shooting_rating} onChange={set("shooting_rating")} color="#ff4d6d" />
        <RatingCard label="防守自评" icon="🛡️" value={form.defending_rating} onChange={set("defending_rating")} color="#7b61ff" />
        <RatingCard label="视野自评" icon="👁️" value={form.vision_rating} onChange={set("vision_rating")} color="#00ff88" />
      </motion.div>

      {/* Submit */}
      <motion.div
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
        className="relative z-20 flex justify-center pb-12"
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleGenerate}
          disabled={generating || form.positions.length === 0}
          className="flex items-center gap-3 px-14 py-4 rounded-2xl text-black font-black text-lg tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: "linear-gradient(90deg, #00aaff, #00ddff, #7b61ff)",
            boxShadow: "0 0 30px rgba(0,170,255,0.6), 0 0 60px rgba(0,170,255,0.3)",
          }}
        >
          <Zap className="w-5 h-5" />
          {generating ? "生成中..." : "生成球员数值"}
        </motion.button>
      </motion.div>
    </div>
  );
}
