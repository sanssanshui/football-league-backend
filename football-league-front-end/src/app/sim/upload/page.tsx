"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Zap } from "lucide-react";

const containerV = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.2 } },
};
const cardV = {
  hidden: { opacity: 0, y: 40, scale: 0.92 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 120, damping: 16 } },
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
      {/* corner accents */}
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

export default function UploadFitnessPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    height: 175, weight: 70, age: 25,
    bloodType: "A", restingHR: 70,
    weeklyFreq: 3, sessionDuration: 60,
  });
  const set = (k: keyof typeof form) => (v: number | string) =>
    setForm(p => ({ ...p, [k]: v }));

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
        className="relative z-10 flex-1 w-full max-w-[960px] mx-auto px-6 pb-10 grid grid-cols-2 gap-5 content-start"
      >
        <SliderCard label="身高" icon="📏" unit="cm" min={140} max={220} value={form.height} onChange={set("height")} color="#00aaff" />
        <SliderCard label="体重" icon="⚖️" unit="kg" min={40} max={150} value={form.weight} onChange={set("weight")} color="#00ddff" />
        <SliderCard label="年龄" icon="🎂" unit="岁" min={10} max={60} value={form.age} onChange={set("age")} color="#7b61ff" />
        <SliderCard label="静息心率" icon="❤️" unit="bpm" min={40} max={120} value={form.restingHR} onChange={set("restingHR")} color="#ff4d6d" />
        <SelectCard label="血型" icon="🩸" options={["A", "B", "AB", "O"]} value={form.bloodType} onChange={set("bloodType")} color="#ff6b35" />
        <SliderCard label="每周运动次数" icon="🏃" unit="次" min={0} max={14} value={form.weeklyFreq} onChange={set("weeklyFreq")} color="#00ff88" />
        <motion.div variants={cardV} className="col-span-2">
          <SliderCard label="平均运动时长" icon="⏱️" unit="分钟" min={10} max={180} step={5} value={form.sessionDuration} onChange={set("sessionDuration")} color="#ffd700" />
        </motion.div>
      </motion.div>

      {/* Submit */}
      <motion.div
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
        className="relative z-20 flex justify-center pb-12"
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => router.push("/sim/match")}
          className="flex items-center gap-3 px-14 py-4 rounded-2xl text-black font-black text-lg tracking-widest"
          style={{
            background: "linear-gradient(90deg, #00aaff, #00ddff, #7b61ff)",
            boxShadow: "0 0 30px rgba(0,170,255,0.6), 0 0 60px rgba(0,170,255,0.3)",
          }}
        >
          <Zap className="w-5 h-5" />
          生成球员数值
        </motion.button>
      </motion.div>
    </div>
  );
}
