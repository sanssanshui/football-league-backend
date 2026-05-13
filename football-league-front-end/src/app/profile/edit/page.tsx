"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { UserCog, Camera, Search, LogIn, User } from "lucide-react";
import { useUserStore } from "@/lib/store";
import Link from "next/link";

const API = "http://localhost:5002";

interface ProfileData {
  avatar_url: string | null;
  gender: string;
  birthday: string;
  birthplace: string;
  bio: string;
}

export default function EditProfilePage() {
  const router = useRouter();
  const { token, username } = useUserStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [form, setForm] = useState<ProfileData>({
    avatar_url: null, gender: "", birthday: "", birthplace: "", bio: "",
  });
  const [preview, setPreview] = useState<string | null>(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const bgX = useTransform(mouseX, [-1, 1], [-20, 20]);
  const bgY = useTransform(mouseY, [-1, 1], [-20, 20]);
  const onMouseMove = (e: React.MouseEvent) => {
    mouseX.set((e.clientX / window.innerWidth - 0.5) * 2);
    mouseY.set((e.clientY / window.innerHeight - 0.5) * 2);
  };

  useEffect(() => {
    setMounted(true);
    if (!token) { router.replace("/auth"); return; }
    // Load existing profile
    fetch(`${API}/api/user/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.json()).then(json => {
      if (json.code === 200) {
        const d = json.data;
        setForm({
          avatar_url: d.avatar_url || null,
          gender: d.gender || "",
          birthday: d.birthday || "",
          birthplace: d.birthplace || "",
          bio: d.bio || "",
        });
        if (d.avatar_url) setPreview(d.avatar_url);
      }
    }).catch(() => {});
  }, [token, router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setPreview(dataUrl);
      setForm(prev => ({ ...prev, avatar_url: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!token) return;
    setSaving(true); setMsg(null);
    try {
      const res = await fetch(`${API}/api/user/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.code === 200) {
        setMsg({ text: "保存成功！", ok: true });
        setTimeout(() => router.push("/profile"), 800);
      } else {
        setMsg({ text: json.message || "保存失败", ok: false });
      }
    } catch {
      setMsg({ text: "无法连接到服务器", ok: false });
    } finally {
      setSaving(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-[#0a0a0a] to-[#111] text-white font-sans overflow-hidden relative" onMouseMove={onMouseMove}>
      <motion.div className="absolute inset-[-50px] z-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/pexels-markusspiske-114296.jpg')", x: bgX, y: bgY }} />
      <div className="absolute inset-0 bg-black/50 z-0 pointer-events-none" />

      {/* Unified Nav Bar */}
      <nav className="sticky top-0 z-50 w-full h-[68px] bg-black/30 backdrop-blur-xl border-b border-white/10">
        <div className="w-[1200px] h-full mx-auto flex items-center justify-between px-4">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-[17px] text-white/75 hover:text-white transition-all">首页</Link>
            <Link href="/matches" className="text-[17px] text-white/75 hover:text-white transition-all">赛事</Link>
            <Link href="/teams" className="text-[17px] text-white/75 hover:text-white transition-all">球员/球队</Link>
            <Link href="/community?tab=quiz" className="text-[17px] text-white/75 hover:text-white transition-all">互动</Link>
            <Link href="/shop" className="text-[17px] text-white/75 hover:text-white transition-all">周边商城</Link>
            <Link href="/analysis/upload" className="text-[17px] text-white/75 hover:text-white transition-all">视频分析</Link>
          </div>
          <div className="flex items-center gap-5">
            <div className="w-[280px] h-[36px] bg-white/10 rounded-full flex items-center border border-white/20 overflow-hidden">
              <input type="text" placeholder="搜索比赛、球队、球员..." className="w-full h-full bg-transparent outline-none px-4 text-[13px] text-white placeholder:text-white/40" />
              <Search className="w-4 h-4 text-white/40 mr-3 shrink-0" />
            </div>
            <Link href="/auth" className="flex items-center gap-1 text-white/75 hover:text-white text-[15px] transition-all whitespace-nowrap"><LogIn className="w-4 h-4" /> 登录</Link>
            <Link href="/profile" className="flex items-center gap-1 text-white border-b-2 border-[#00ff00] text-[15px] transition-all whitespace-nowrap"><User className="w-4 h-4" /> {username || '个人中心'}</Link>
          </div>
        </div>
      </nav>

      {/* Page content */}
      <div className="relative z-10 flex justify-center items-center min-h-[calc(100vh-68px)] py-12">
        {/* Card */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 100, damping: 15 }}
          className="w-[560px] bg-black/40 backdrop-blur-2xl border border-white/10 rounded-2xl p-10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">

          <div className="flex items-center gap-2 text-white/60 text-sm mb-6">
            <UserCog className="w-4 h-4" /> 编辑个人信息
          </div>

          <h2 className="text-2xl font-bold text-white mb-8 tracking-wide">编辑个人信息</h2>

          {msg && (
            <div className={`mb-6 px-4 py-3 rounded-xl text-sm font-medium border ${msg.ok ? "bg-[#008000]/20 border-[#008000]/40 text-[#00ff00]" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
              {msg.text}
            </div>
          )}

          {/* Avatar */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative cursor-pointer group" onClick={() => fileRef.current?.click()}>
              <div className="w-24 h-24 rounded-full border-2 border-[#008000] overflow-hidden bg-white/10 flex items-center justify-center shadow-[0_0_20px_rgba(0,128,0,0.3)]">
                {preview
                  ? <img src={preview} alt="avatar" className="w-full h-full object-cover" />
                  : <span className="text-3xl font-bold text-white/60">?</span>
                }
              </div>
              <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-white/40 text-xs mt-2">点击上传头像</p>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>

          {/* Form fields */}
          <div className="space-y-5">
            {/* Gender */}
            <div>
              <label className="block text-sm text-white/60 mb-2">性别</label>
              <div className="flex gap-2">
                {["男", "女", "保密"].map(g => (
                  <button key={g} onClick={() => setForm(p => ({ ...p, gender: g }))}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${form.gender === g ? "bg-[#008000]/80 border-[#008000] text-white shadow-[0_0_12px_rgba(0,128,0,0.3)]" : "bg-white/10 border-white/20 text-white/60 hover:bg-white/10 hover:text-white"}`}>
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Birthday */}
            <div>
              <label className="block text-sm text-white/60 mb-2">出生日期</label>
              <input type="date" value={form.birthday}
                onChange={e => setForm(p => ({ ...p, birthday: e.target.value }))}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#008000]/60 focus:bg-white/10 transition-all [color-scheme:dark]" />
            </div>

            {/* Birthplace */}
            <div>
              <label className="block text-sm text-white/60 mb-2">出生地</label>
              <input type="text" value={form.birthplace} placeholder="例：江苏省南京市"
                onChange={e => setForm(p => ({ ...p, birthplace: e.target.value }))}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#008000]/60 focus:bg-white/10 transition-all placeholder:text-white/40" />
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm text-white/60 mb-2">个性签名</label>
              <textarea value={form.bio} placeholder="写点什么介绍自己..." rows={3}
                onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#008000]/60 focus:bg-white/10 transition-all placeholder:text-white/40 resize-none" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-8">
            <button onClick={() => router.back()}
              className="flex-1 py-3 rounded-xl bg-white/10 border border-white/20 text-white/60 text-sm hover:bg-white/10 hover:text-white transition-all">
              取消
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#008000] to-[#00b300] text-white text-sm font-semibold disabled:opacity-50 hover:shadow-[0_0_20px_rgba(0,128,0,0.5)] transition-all">
              {saving ? "保存中..." : "保存设置"}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
