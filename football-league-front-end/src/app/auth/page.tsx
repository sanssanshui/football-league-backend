"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useUserStore } from "@/lib/store";
import { useTheme } from "next-themes";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5002";

export default function AuthPage() {
    const router = useRouter();
    const setLoginState = useUserStore((state) => state.login);
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);

    const [countdown, setCountdown] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [activeTab, setActiveTab] = useState("login");

    const [loginForm, setLoginForm] = useState({ username: "", password: "", code: "" });
    const [regForm, setRegForm] = useState({ username: "", password: "", confirmPassword: "", phone: "", code: "" });

    useEffect(() => {
        setMounted(true);
    }, []);

    // TODO: The verification code here is currently a mock. It accepts any code frontend-side. 
    // Wait for real SMS API integration (e.g., Aliyun/Twilio) to validate this securely on the backend.
    const handleSendCode = () => {
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
                body: JSON.stringify({ username: loginForm.username, password: loginForm.password }),
            });
            const data = await res.json();
            if (data.code === 200) {
  setLoginState({
    user_id: data.data.userId,
    access_token: data.data.access_token,
    username: data.data.username,
    avatar_url: data.data.avatar_url || null,
  });
  router.push("/");
} else {
                setErrorMsg(data.message || "登录失败，用户名或密码错误。");
            }
        } catch {
            setErrorMsg("网络请求失败，请检查后端服务是否已完全启动 (npm run start:dev)。");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (regForm.password !== regForm.confirmPassword) {
            setErrorMsg("两次输入的密码不一致，请重新输入。");
            return;
        }
        if (!regForm.code) {
            setErrorMsg("请输入验证码。");
            return;
        }

        setIsLoading(true);
        setErrorMsg("");
        try {
            const res = await fetch(`${API_URL}/api/user/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: regForm.username,
                    password: regForm.password,
                    phone: regForm.phone,
                }),
            });
            const data = await res.json();
            if (data.code === 200) {
                const loginRes = await fetch(`${API_URL}/api/user/login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username: regForm.username, password: regForm.password }),
                });
                const loginData = await loginRes.json();
                if (loginData.code === 200) {
  setLoginState({
    user_id: loginData.data.userId,
    access_token: loginData.data.access_token,
    username: loginData.data.username,
    avatar_url: loginData.data.avatar_url || null,
  });
  router.push("/");
}
            } else {
                setErrorMsg(data.message || "注册失败，请检查填写信息。");
            }
        } catch {
            setErrorMsg("网络请求失败，请检查后端服务是否已运行。");
        } finally {
            setIsLoading(false);
        }
    };

    // Determine background image based on active tab
    const bgImage = activeTab === 'login'
        ? "/images/1.jpg" // Login image
        : "/images/2.jpg"; // Register image

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 transition-colors duration-500 p-4 md:p-8 relative overflow-hidden">

            {/* Ambient background glow */}
            <div className="absolute inset-0 z-0 opacity-40 dark:opacity-30 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/40 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[128px]" />
                <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-emerald-500/40 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[128px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-full max-w-5xl bg-white dark:bg-slate-950 rounded-2xl shadow-2xl overflow-hidden relative z-10 flex flex-col md:flex-row border border-gray-200 dark:border-white/10"
                style={{ minHeight: '650px' }}
            >
                {/* Left Side: Dynamic Image */}
                <div className="md:w-1/2 relative hidden md:block overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <AnimatePresence mode="wait">
                        <motion.img
                            key={bgImage}
                            src={bgImage}
                            initial={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
                            animate={{ opacity: mounted && theme === 'dark' ? 0.3 : 1, scale: 1, filter: 'blur(0px)' }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.8 }}
                            className="absolute inset-0 w-full h-full object-cover"
                            alt="Football Environment"
                        />
                    </AnimatePresence>
                    {/* Gradient Overlay for night theme or text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-900/30 to-transparent transition-opacity duration-500 dark:opacity-100 opacity-60" />

                    <div className="absolute bottom-10 left-10 right-10 text-white">
                        <motion.h2
                            key={`title-${activeTab}`}
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-3xl font-bold mb-2 tracking-wide text-white drop-shadow-md"
                        >
                            {activeTab === 'login' ? '重返绿茵场' : '开启足球生涯'}
                        </motion.h2>
                        <motion.p
                            key={`desc-${activeTab}`}
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="text-white/90 drop-shadow-md font-medium"
                        >
                            {activeTab === 'login'
                                ? '欢迎回来，查看最新的赛事比分，参与球迷热议。'
                                : '加入我们，记录你的每一次助攻，每一个进球。'}
                        </motion.p>
                    </div>
                </div>

                {/* Right Side: Form */}
                <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-center relative bg-white dark:bg-slate-950">

                    <Link href="/" className="absolute top-6 left-6 md:left-8 inline-flex items-center text-sm font-medium text-gray-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        返回主页
                    </Link>

                    <div className="mt-8 mb-6">
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">足球联盟中心</h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-2">
                            连接每一位热爱足球的你
                        </p>
                    </div>

                    <AnimatePresence mode="popLayout">
                        {errorMsg && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-sm font-medium"
                            >
                                {errorMsg}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="relative flex w-full bg-transparent border-b border-gray-200 dark:border-slate-800 mb-8 p-0 h-auto">
                            <TabsTrigger
                                value="login"
                                className="flex-1 rounded-none text-base border-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-none transition-all py-3 font-bold shadow-none hover:bg-gray-50/50 dark:hover:bg-slate-900/50 relative text-gray-500 dark:text-gray-400"
                            >
                                账号登录
                                {activeTab === 'login' && (
                                    <motion.div layoutId="auth-tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
                                )}
                            </TabsTrigger>
                            <TabsTrigger
                                value="register"
                                className="flex-1 rounded-none text-base border-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-none transition-all py-3 font-bold shadow-none hover:bg-gray-50/50 dark:hover:bg-slate-900/50 relative text-gray-500 dark:text-gray-400"
                            >
                                注册账户
                                {activeTab === 'register' && (
                                    <motion.div layoutId="auth-tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
                                )}
                            </TabsTrigger>
                        </TabsList>

                        {/* LOGIN CONTENT */}
                        <TabsContent value="login" className="mt-0">
                            <form onSubmit={handleLogin} className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="login-username" className="text-gray-700 dark:text-gray-300 text-sm font-semibold">账号名称 / 手机号</Label>
                                    <Input
                                        id="login-username"
                                        value={loginForm.username}
                                        onChange={e => setLoginForm({ ...loginForm, username: e.target.value })}
                                        required
                                        placeholder="输入您的账号"
                                        className="h-12 bg-gray-50 dark:bg-slate-900/50 border-gray-200 dark:border-slate-800 focus-visible:ring-emerald-500 px-4 text-base transition-shadow"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="login-password" className="text-gray-700 dark:text-gray-300 text-sm font-semibold">密码</Label>
                                    <Input
                                        id="login-password"
                                        type="password"
                                        value={loginForm.password}
                                        onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                                        required
                                        placeholder="输入密码"
                                        className="h-12 bg-gray-50 dark:bg-slate-900/50 border-gray-200 dark:border-slate-800 focus-visible:ring-emerald-500 px-4 text-base transition-shadow"
                                    />
                                </div>

                                <div className="flex items-center space-x-3 pt-4 pb-2">
                                    <Checkbox id="login-terms" required className="w-5 h-5 border-gray-300 dark:border-slate-600 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500" />
                                    <label htmlFor="login-terms" className="text-sm text-gray-500 dark:text-gray-400">
                                        我已阅读并同意 <Link href="/user-agreement" className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium">用户协议</Link> 和 <Link href="/privacy-policy" className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium">隐私条款</Link>
                                    </label>
                                </div>

                                <Button type="submit" disabled={isLoading} className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-lg font-bold transition-all shadow-lg shadow-emerald-500/20">
                                    {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "立即进入"}
                                </Button>
                            </form>
                        </TabsContent>

                        {/* REGISTER CONTENT */}
                        <TabsContent value="register" className="mt-0">
                            <form onSubmit={handleRegister} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="reg-username" className="text-gray-700 dark:text-gray-300 text-sm font-semibold">账户名称</Label>
                                    <Input
                                        id="reg-username"
                                        value={regForm.username}
                                        onChange={e => setRegForm({ ...regForm, username: e.target.value })}
                                        required
                                        placeholder="起个有震慑力的名字"
                                        className="h-11 bg-gray-50 dark:bg-slate-900/50 border-gray-200 dark:border-slate-800 focus-visible:ring-emerald-500 px-4 transition-shadow"
                                    />
                                </div>

                                <div className="flex gap-4">
                                    <div className="space-y-2 flex-1">
                                        <Label htmlFor="reg-phone" className="text-gray-700 dark:text-gray-300 text-sm font-semibold">手机号码</Label>
                                        <Input
                                            id="reg-phone"
                                            value={regForm.phone}
                                            onChange={e => setRegForm({ ...regForm, phone: e.target.value })}
                                            required
                                            placeholder="您的手机号"
                                            className="h-11 bg-gray-50 dark:bg-slate-900/50 border-gray-200 dark:border-slate-800 focus-visible:ring-emerald-500 px-4 transition-shadow placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white"
                                        />
                                    </div>

                                    <div className="space-y-2 flex-1">
                                        <Label htmlFor="reg-code" className="text-gray-700 dark:text-gray-300 text-sm font-semibold">验证码</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                id="reg-code"
                                                value={regForm.code}
                                                onChange={e => setRegForm({ ...regForm, code: e.target.value })}
                                                required
                                                placeholder="6位验证码"
                                                className="h-11 bg-gray-50 dark:bg-slate-900/50 border-gray-200 dark:border-slate-800 focus-visible:ring-emerald-500 px-4 transition-shadow w-full placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white"
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={handleSendCode}
                                                disabled={countdown > 0}
                                                className="h-11 whitespace-nowrap px-3 bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 font-medium transition-colors"
                                            >
                                                {countdown > 0 ? `${countdown}s` : '获取'}
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="reg-password" className="text-gray-700 dark:text-gray-300 text-sm font-semibold">设置密码</Label>
                                    <Input
                                        id="reg-password"
                                        type="password"
                                        value={regForm.password}
                                        onChange={e => setRegForm({ ...regForm, password: e.target.value })}
                                        required
                                        placeholder="不少于8位"
                                        className="h-11 bg-gray-50 dark:bg-slate-900/50 border-gray-200 dark:border-slate-800 focus-visible:ring-emerald-500 px-4 transition-shadow"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="reg-confirm-password" className="text-gray-700 dark:text-gray-300 text-sm font-semibold">确认密码</Label>
                                    <Input
                                        id="reg-confirm-password"
                                        type="password"
                                        value={regForm.confirmPassword}
                                        onChange={e => setRegForm({ ...regForm, confirmPassword: e.target.value })}
                                        required
                                        placeholder="再次输入密码"
                                        className="h-11 bg-gray-50 dark:bg-slate-900/50 border-gray-200 dark:border-slate-800 focus-visible:ring-emerald-500 px-4 transition-shadow"
                                    />
                                </div>

                                <div className="flex items-center space-x-3 pt-3 pb-1">
                                    <Checkbox id="reg-terms" required className="w-5 h-5 border-gray-300 dark:border-slate-600 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500" />
                                    <label htmlFor="reg-terms" className="text-sm text-gray-500 dark:text-gray-400">
                                        注册代表同意 <Link href="/user-agreement" className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium">用户协议</Link> 和 <Link href="/privacy-policy" className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium">隐私条款</Link>
                                    </label>
                                </div>

                                <Button type="submit" disabled={isLoading} className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-lg font-bold transition-all shadow-lg shadow-emerald-500/20 mt-1">
                                    {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "完成注册"}
                                </Button>
                            </form>
                        </TabsContent>
                    </Tabs>
                </div>
            </motion.div>
        </div>
    );
}
