"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useUserStore } from "@/lib/store";

// ✅ 修复：和后端端口统一为5000
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function AuthPage() {
    const router = useRouter();
    const setLoginState = useUserStore((state) => state.login);
    const [mounted, setMounted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [activeTab, setActiveTab] = useState<"login" | "register">("login");
    const [countdown, setCountdown] = useState(0);

    const [loginForm, setLoginForm] = useState({ username: "", password: "" });
    const [regForm, setRegForm] = useState({ username: "", phone: "", password: "", confirmPassword: "" });

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleSendCode = () => {
        if (countdown > 0) return;
        setCountdown(60);
        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg("");

        try {
            const res = await fetch(`${API_URL}/api/user/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: loginForm.username,
                    password: loginForm.password
                }),
            });

            const data = await res.json();

            if (data.code === 200) {
                // ✅ 修复：字段和后端返回完全对齐
                setLoginState({
                    user_id: data.data.user_id,
                    access_token: data.data.token,
                    username: data.data.username,
                    avatar_url: data.data.avatar_url || null,
                });

                // 同步保存到localStorage（和HTML逻辑一致）
                localStorage.setItem("token", data.data.token);
                localStorage.setItem("user_id", String(data.data.user_id));
                localStorage.setItem("username", data.data.username);
                
                const expireTime = Date.now() + (data.data.expire_seconds || 86400) * 1000;
                localStorage.setItem("token_expire", expireTime.toString());
                localStorage.setItem("last_username", loginForm.username);

                // 登录成功直接跳首页
                router.push("/");
            } else {
                setErrorMsg(data.message || "登录失败，用户名或密码错误。");
            }
        } catch (err) {
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
                body: JSON.stringify({
                    username: regForm.username,
                    phone: regForm.phone,
                    password: regForm.password
                }),
            });

            const data = await res.json();

            if (data.code === 200) {
                // 注册成功自动登录
                setTimeout(async () => {
                    const loginRes = await fetch(`${API_URL}/api/user/login`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            username: regForm.username,
                            password: regForm.password
                        }),
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
        } catch (err) {
            setErrorMsg("网络请求失败，请检查后端服务。");
        } finally {
            setIsLoading(false);
        }
    };

    const bgImage = activeTab === 'login' ? "/images/1.jpg" : "/images/2.jpg";

    if (!mounted) return null;

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5] p-4 font-sans">
            <div className="w-[760px] h-[530px] bg-white shadow-lg rounded-lg overflow-hidden flex relative">
                
                <Link href="/" className="absolute top-3 left-3 z-50 bg-white/90 text-gray-800 px-4 py-2 rounded-full shadow-md hover:bg-white hover:text-[#008000] transition-colors text-sm font-medium">
                    ← 返回
                </Link>

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
                </div>

                <div className="w-full md:w-1/2 p-10 flex flex-col justify-center">
                    <div className="mb-8">
                        <div className="flex items-baseline gap-6 mb-6">
                            <button
                                onClick={() => setActiveTab("login")}
                                className={`text-2xl font-bold transition-all ${activeTab === "login" ? "text-black text-3xl" : "text-black/50 text-2xl"}`}
                            >
                                登录
                            </button>
                            <button
                                onClick={() => setActiveTab("register")}
                                className={`text-2xl font-medium transition-all ${activeTab === "register" ? "text-black text-3xl" : "text-black/50 text-2xl"}`}
                            >
                                注册
                            </button>
                        </div>

                        {errorMsg && (
                            <div className="mb-4 text-[#ff3860] text-sm text-center">
                                {errorMsg}
                            </div>
                        )}

                        {activeTab === "login" && (
                            <form onSubmit={handleLogin} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-800">用户名</label>
                                    <input
                                        type="text"
                                        value={loginForm.username}
                                        onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                                        className="w-full h-[40px] bg-[#E7E7E7] rounded px-3 focus:bg-[#d0d0d0] outline-none text-gray-800"
                                        placeholder="请输入用户名"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-800">密码</label>
                                    <input
                                        type="password"
                                        value={loginForm.password}
                                        onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                                        className="w-full h-[40px] bg-[#E7E7E7] rounded px-3 focus:bg-[#d0d0d0] outline-none text-gray-800"
                                        placeholder="请输入密码"
                                        required
                                    />
                                </div>

                                <div className="flex items-center mt-2 mb-4">
                                    <div className="w-[18px] h-[18px] border border-[#E7E7E7] rounded-full flex items-center justify-center cursor-pointer mr-2">
                                        ✓
                                    </div>
                                    <span className="text-sm text-gray-800">
                                        同意《用户协议》和《隐私条款》
                                    </span>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-[260px] h-[45px] bg-[#FF6700] text-white rounded-lg mx-auto block text-lg font-medium hover:bg-[#e55c00] transition-colors disabled:bg-gray-300"
                                >
                                    {isLoading ? "处理中..." : "登录"}
                                </button>
                            </form>
                        )}

                        {activeTab === "register" && (
                            <form onSubmit={handleRegister} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-800">用户名</label>
                                    <input
                                        type="text"
                                        value={regForm.username}
                                        onChange={(e) => setRegForm({ ...regForm, username: e.target.value })}
                                        className="w-full h-[40px] bg-[#E7E7E7] rounded px-3 focus:bg-[#d0d0d0] outline-none text-gray-800"
                                        placeholder="请输入用户名"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-800">手机号</label>
                                    <input
                                        type="tel"
                                        value={regForm.phone}
                                        onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                                        className="w-full h-[40px] bg-[#E7E7E7] rounded px-3 focus:bg-[#d0d0d0] outline-none text-gray-800"
                                        placeholder="请输入手机号"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-800">密码</label>
                                    <input
                                        type="password"
                                        value={regForm.password}
                                        onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                                        className="w-full h-[40px] bg-[#E7E7E7] rounded px-3 focus:bg-[#d0d0d0] outline-none text-gray-800"
                                        placeholder="请输入密码"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-800">确认密码</label>
                                    <input
                                        type="password"
                                        value={regForm.confirmPassword}
                                        onChange={(e) => setRegForm({ ...regForm, confirmPassword: e.target.value })}
                                        className="w-full h-[40px] bg-[#E7E7E7] rounded px-3 focus:bg-[#d0d0d0] outline-none text-gray-800"
                                        placeholder="请再次输入密码"
                                        required
                                    />
                                </div>

                                <div className="flex items-center mt-2 mb-4">
                                    <div className="w-[18px] h-[18px] border border-[#E7E7E7] rounded-full flex items-center justify-center cursor-pointer mr-2">
                                        ✓
                                    </div>
                                    <span className="text-sm text-gray-800">
                                        同意《用户协议》和《隐私条款》
                                    </span>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-[260px] h-[45px] bg-[#FF6700] text-white rounded-lg mx-auto block text-lg font-medium hover:bg-[#e55c00] transition-colors disabled:bg-gray-300"
                                >
                                    {isLoading ? "处理中..." : "注册"}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}