"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, User, LogIn } from "lucide-react";
import { useUserStore } from "@/lib/store";

const API_URL = "http://localhost:5002";

export default function AuthPage() {
    const router = useRouter();
    const setLoginState = useUserStore((state) => state.login);
    const { username } = useUserStore();
    const [mounted, setMounted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [activeTab, setActiveTab] = useState<"login" | "register">("login");

    const [loginForm, setLoginForm] = useState({ username: "", password: "" });
    const [regForm, setRegForm] = useState({ username: "", phone: "", password: "", confirmPassword: "" });

    useEffect(() => { setMounted(true); }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg("");
        try {
            const res = await fetch(`${API_URL}/api/user/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: loginForm.username, password: loginForm.password }),
            });
            const data = await res.json();
            if (data.code === 200) {
                setLoginState({
                    user_id: data.data.user_id,
                    access_token: data.data.token,
                    username: data.data.username,
                    avatar_url: data.data.avatar_url || null,
                });
                localStorage.setItem("token", data.data.token);
                localStorage.setItem("user_id", String(data.data.user_id));
                localStorage.setItem("username", data.data.username);
                const expireTime = Date.now() + (data.data.expire_seconds || 86400) * 1000;
                localStorage.setItem("token_expire", expireTime.toString());
                localStorage.setItem("last_username", loginForm.username);
                router.push("/");
            } else {
                setErrorMsg(data.message || "登录失败，用户名或密码错误。");
            }
        } catch {
            setErrorMsg("网络错误，请检查网络连接或后端服务是否启动。");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg("");
        if (regForm.password !== regForm.confirmPassword) {
            setErrorMsg("两次输入的密码不一致。");
            setIsLoading(false);
            return;
        }
        try {
            const res = await fetch(`${API_URL}/api/user/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: regForm.username, phone: regForm.phone, password: regForm.password }),
            });
            const data = await res.json();
            if (data.code === 200) {
                setTimeout(async () => {
                    const loginRes = await fetch(`${API_URL}/api/user/login`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ username: regForm.username, password: regForm.password }),
                    });
                    const loginData = await loginRes.json();
                    if (loginData.code === 200) {
                        setLoginState({
                            user_id: loginData.data.user_id,
                            access_token: loginData.data.token,
                            username: loginData.data.username,
                            avatar_url: loginData.data.avatar_url || null,
                        });
                        localStorage.setItem("token", loginData.data.token);
                        localStorage.setItem("user_id", String(loginData.data.user_id));
                        localStorage.setItem("username", loginData.data.username);
                        localStorage.setItem("last_username", regForm.username);
                        router.push("/");
                    }
                }, 500);
            } else {
                setErrorMsg(data.message || "注册失败，请检查信息是否正确。");
            }
        } catch {
            setErrorMsg("网络请求失败，请检查后端服务。");
        } finally {
            setIsLoading(false);
        }
    };

    const bgImage = activeTab === "login" ? "/images/1.jpg" : "/images/2.jpg";

    if (!mounted) return null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-black via-[#0a0a0a] to-[#111] text-white">
            {/* 导航栏 */}
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
                        <Link href="/auth" className="flex items-center gap-1 text-white border-b-2 border-[#00ff00] text-[15px] transition-all whitespace-nowrap">
                            <LogIn className="w-4 h-4" /> 登录
                        </Link>
                        <Link href="/profile" className="flex items-center gap-1 text-white/75 hover:text-white text-[15px] transition-all whitespace-nowrap">
                            <User className="w-4 h-4" /> {username || "个人中心"}
                        </Link>
                    </div>
                </div>
            </nav>

            {/* 主内容 */}
            <div className="flex items-center justify-center min-h-[calc(100vh-68px)] p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-[760px] h-[530px] bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[32px] overflow-hidden flex shadow-[0_8px_40px_rgba(0,0,0,0.6)]"
                >
                    {/* 左侧图片 */}
                    <div className="hidden md:block w-1/2 relative overflow-hidden">
                        <AnimatePresence mode="wait">
                            <motion.img
                                key={bgImage}
                                src={bgImage}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.5 }}
                                className="absolute inset-0 w-full h-full object-cover"
                                alt="Background"
                            />
                        </AnimatePresence>
                        <div className="absolute inset-0 bg-black/30" />
                    </div>

                    {/* 右侧表单 */}
                    <div className="w-full md:w-1/2 p-10 flex flex-col justify-center">
                        <div className="mb-8">
                            {/* Tab 切换 */}
                            <div className="flex items-baseline gap-6 mb-6">
                                <button
                                    onClick={() => setActiveTab("login")}
                                    className={`text-2xl font-bold transition-all pb-1 ${activeTab === "login" ? "text-white text-3xl border-b-2 border-[#00ff00]" : "text-white/40 text-2xl"}`}
                                >
                                    登录
                                </button>
                                <button
                                    onClick={() => setActiveTab("register")}
                                    className={`text-2xl font-medium transition-all pb-1 ${activeTab === "register" ? "text-white text-3xl border-b-2 border-[#00ff00]" : "text-white/40 text-2xl"}`}
                                >
                                    注册
                                </button>
                            </div>

                            {errorMsg && (
                                <div className="mb-4 text-red-400 text-sm text-center bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                                    {errorMsg}
                                </div>
                            )}

                            {activeTab === "login" && (
                                <form onSubmit={handleLogin} className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-medium text-white/60">用户名</label>
                                        <input
                                            type="text"
                                            value={loginForm.username}
                                            onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                                            className="w-full h-[42px] bg-white/10 border border-white/20 rounded-xl px-4 text-white placeholder:text-white/30 outline-none focus:border-[#00ff00]/50 focus:bg-white/15 transition-all"
                                            placeholder="请输入用户名"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-medium text-white/60">密码</label>
                                        <input
                                            type="password"
                                            value={loginForm.password}
                                            onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                                            className="w-full h-[42px] bg-white/10 border border-white/20 rounded-xl px-4 text-white placeholder:text-white/30 outline-none focus:border-[#00ff00]/50 focus:bg-white/15 transition-all"
                                            placeholder="请输入密码"
                                            required
                                        />
                                    </div>
                                    <div className="flex items-center mt-2 mb-4">
                                        <div className="w-[18px] h-[18px] border border-white/30 rounded-full flex items-center justify-center cursor-pointer mr-2 text-[#00ff00] text-xs">✓</div>
                                        <span className="text-sm text-white/50">同意《用户协议》和《隐私条款》</span>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-[260px] h-[45px] bg-gradient-to-r from-[#008000] to-[#00b300] text-white rounded-xl mx-auto block text-lg font-medium hover:shadow-[0_4px_20px_rgba(0,128,0,0.4)] transition-all disabled:opacity-50"
                                    >
                                        {isLoading ? "处理中..." : "登录"}
                                    </button>
                                </form>
                            )}

                            {activeTab === "register" && (
                                <form onSubmit={handleRegister} className="space-y-3">
                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-medium text-white/60">用户名</label>
                                        <input
                                            type="text"
                                            value={regForm.username}
                                            onChange={(e) => setRegForm({ ...regForm, username: e.target.value })}
                                            className="w-full h-[42px] bg-white/10 border border-white/20 rounded-xl px-4 text-white placeholder:text-white/30 outline-none focus:border-[#00ff00]/50 focus:bg-white/15 transition-all"
                                            placeholder="请输入用户名"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-medium text-white/60">手机号</label>
                                        <input
                                            type="tel"
                                            value={regForm.phone}
                                            onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                                            className="w-full h-[42px] bg-white/10 border border-white/20 rounded-xl px-4 text-white placeholder:text-white/30 outline-none focus:border-[#00ff00]/50 focus:bg-white/15 transition-all"
                                            placeholder="请输入手机号"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-medium text-white/60">密码</label>
                                        <input
                                            type="password"
                                            value={regForm.password}
                                            onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                                            className="w-full h-[42px] bg-white/10 border border-white/20 rounded-xl px-4 text-white placeholder:text-white/30 outline-none focus:border-[#00ff00]/50 focus:bg-white/15 transition-all"
                                            placeholder="请输入密码"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-medium text-white/60">确认密码</label>
                                        <input
                                            type="password"
                                            value={regForm.confirmPassword}
                                            onChange={(e) => setRegForm({ ...regForm, confirmPassword: e.target.value })}
                                            className="w-full h-[42px] bg-white/10 border border-white/20 rounded-xl px-4 text-white placeholder:text-white/30 outline-none focus:border-[#00ff00]/50 focus:bg-white/15 transition-all"
                                            placeholder="请再次输入密码"
                                            required
                                        />
                                    </div>
                                    <div className="flex items-center mt-1 mb-2">
                                        <div className="w-[18px] h-[18px] border border-white/30 rounded-full flex items-center justify-center cursor-pointer mr-2 text-[#00ff00] text-xs">✓</div>
                                        <span className="text-sm text-white/50">同意《用户协议》和《隐私条款》</span>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-[260px] h-[45px] bg-gradient-to-r from-[#008000] to-[#00b300] text-white rounded-xl mx-auto block text-lg font-medium hover:shadow-[0_4px_20px_rgba(0,128,0,0.4)] transition-all disabled:opacity-50"
                                    >
                                        {isLoading ? "处理中..." : "注册"}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
