"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MoveRight, PlayCircle, Trophy, MessageSquare, Target, Flame, ChevronRight, Activity, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";

export default function Home() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [hour, setHour] = useState(12);

  useEffect(() => {
    setMounted(true);
    const currentHour = new Date().getHours();
    setHour(currentHour);

    // Easter Egg: Auto-adjust theme on first visit based on local time
    const userHasLocalPreference = localStorage.getItem("theme");
    if (!userHasLocalPreference || userHasLocalPreference === "system") {
      if (currentHour >= 19 || currentHour < 6) {
        setTheme("dark");
      } else {
        setTheme("light");
      }
    }
  }, [setTheme]);

  const isNight = theme === 'dark';

  return (
    <main className="relative min-h-screen bg-emerald-50 dark:bg-slate-950 transition-colors duration-700 overflow-x-hidden pb-20">

      {/* 1. HERO SECTION WITH IMAGE BACKGROUND & DYNAMIC LIGHTING EASTER EGG */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">

        {/* Base Background depending on theme using standard Tailwind classes to avoid hydration mismatch */}
        <div className="absolute inset-0 z-0 transition-colors duration-1000 bg-emerald-500 dark:bg-slate-950" />

        {/* Dynamic Celestial Body (Sun/Moon) */}
        {mounted && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 2, ease: "easeOut" }}
            className="absolute top-1/4 right-1/4 z-0 pointer-events-none"
          >
            {isNight ? (
              <div className="relative">
                <Moon className="text-blue-100 w-32 h-32 opacity-80 drop-shadow-[0_0_50px_rgba(191,219,254,0.5)]" strokeWidth={1} />
                <div className="absolute inset-0 bg-blue-400 rounded-full blur-[100px] opacity-20 mix-blend-screen" />
              </div>
            ) : (
              <div className="relative">
                <Sun className="text-yellow-200 w-40 h-40 opacity-90 drop-shadow-[0_0_60px_rgba(253,224,71,0.8)]" strokeWidth={1} />
                <div className="absolute inset-0 bg-yellow-400 rounded-full blur-[100px] opacity-40 mix-blend-screen" />
              </div>
            )}
          </motion.div>
        )}

        <div className="absolute inset-0 z-0">
          {mounted && (
            <img
              src={isNight ? "/images/homepage_dark.jpg" : "/images/homepage.jpg"}
              className="object-cover w-full h-full opacity-80 dark:opacity-50 transition-all duration-700 mix-blend-luminosity dark:mix-blend-normal"
              alt="Football Stadium Background"
            />
          )}
          {/* Theme-aware gradient overlay focusing the light and providing smooth transition to content */}
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 via-transparent to-emerald-50 dark:from-transparent dark:to-slate-950 transition-all duration-700" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/5 via-transparent to-black/5 dark:from-black/80 dark:via-black/30 dark:to-black/80" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 container mx-auto px-4 flex flex-col items-center text-center pt-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="inline-flex items-center rounded-full border border-white/40 bg-white/20 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-md mb-8 shadow-sm"
          >
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 mr-2 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
            2026 赛季火热进行中
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-5xl md:text-7xl font-extrabold text-white tracking-tight mb-6 drop-shadow-2xl"
          >
            探索足球世界的 <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-emerald-500 line-clamp-1 pb-2 font-black drop-shadow-lg">
              无限可能
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="max-w-2xl text-lg md:text-xl text-gray-100 dark:text-gray-300 mb-10 drop-shadow-md font-medium"
          >
            加入终极数字球场。在这里，你可以获取个性化赛事推荐、参与实时聊天、
            竞猜比分，并为你心中的本场 MVP 投上神圣一票。
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 mb-20 w-full justify-center px-6"
          >
            <Link href="/auth">
              <Button size="lg" className="w-full sm:w-auto text-base h-14 px-8 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full font-bold transition-transform hover:scale-105 shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                加入球迷社区 <MoveRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/matches">
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-base h-14 px-8 border-white text-white hover:bg-white/20 backdrop-blur-md rounded-full font-bold transition-transform hover:scale-105">
                <PlayCircle className="mr-2 h-5 w-5" /> 观看精彩集锦
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ----------- PAGE CONTENT PIPELINE ----------- */}
      <div className="container mx-auto px-4 z-20 relative -mt-10 space-y-16">

        {/* 2. 个性化推荐 (Personalized Recommendations) */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Flame className="text-orange-500 h-6 w-6" /> 个性化推荐
            </h2>
            <Link href="/news" className="text-emerald-600 dark:text-emerald-400 text-sm font-medium hover:underline flex items-center">
              查看全部 <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Top Match */}
            <div className="group relative rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-md hover:shadow-xl transition-all border border-gray-100 dark:border-white/10 hover:-translate-y-1 cursor-pointer">
              <div className="h-48 bg-[url('https://images.unsplash.com/photo-1574629810360-7efbb6b69fa7?q=80&w=800')] bg-cover bg-center">
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
              </div>
              <div className="p-5">
                <span className="inline-block px-2 py-1 bg-red-100 text-red-600 text-xs font-bold rounded mb-3 flex items-center w-max"><Activity className="w-3 h-3 justify-center items-center mr-1" /> 直播中</span>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">曼城 VS 皇家马德里</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">欧冠半决赛焦点战，下半场 67&apos;</p>
                <Button variant="secondary" className="w-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 font-bold tracking-wide">
                  立即进入包厢
                </Button>
              </div>
            </div>

            {/* Breaking News */}
            <div className="group relative rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-md hover:shadow-xl transition-all border border-gray-100 dark:border-white/10 hover:-translate-y-1 cursor-pointer">
              <div className="h-48 bg-[url('https://images.unsplash.com/photo-1508344928928-7165b67de128?q=80&w=800')] bg-cover bg-center">
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
              </div>
              <div className="p-5">
                <span className="inline-block px-2 py-1 bg-blue-100 text-blue-600 text-xs font-bold rounded mb-3">转会头条</span>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">重磅！超级巨星达成口头协议</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">据名记透露，这笔震撼转会已接近尾声...</p>
                <Button variant="ghost" className="w-full text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-slate-800">阅读全貌</Button>
              </div>
            </div>

            {/* Highlights */}
            <div className="group relative rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-md hover:shadow-xl transition-all border border-gray-100 dark:border-white/10 hover:-translate-y-1 cursor-pointer">
              <div className="h-48 bg-[url('https://images.unsplash.com/photo-1518605368461-1e18445778a8?q=80&w=800')] bg-cover bg-center">
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <PlayCircle className="text-white/80 w-14 h-14 group-hover:scale-110 group-hover:text-emerald-400 transition-all drop-shadow-lg" />
                </div>
              </div>
              <div className="p-5">
                <span className="inline-block px-2 py-1 bg-purple-100 text-purple-600 text-xs font-bold rounded mb-3">官方集锦</span>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">英超第34轮 全场进球大赏</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">本轮共产生 32 粒进球，不容错过的精彩瞬间。</p>
                <Button variant="ghost" className="w-full text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-slate-800">直接播放</Button>
              </div>
            </div>
          </div>
        </section>


        {/* 3. 互动专区 (Interactive Zone - MVP Voting, Chat, Predictions) */}
        <section>
          <div className="flex items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              互动专区
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* MVP Voting */}
            <div className="relative rounded-2xl bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-slate-900 dark:to-orange-950/30 p-8 border border-yellow-200 dark:border-orange-900/50 shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex flex-col h-full justify-between">
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-4 rounded-xl bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform">
                      <Trophy className="h-7 w-7" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">球迷投票 MVP</h3>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-base mb-8 leading-relaxed">
                    本场【国家德比】表现最佳球员是谁？你的选票决定最终官方全场最佳。
                  </p>
                </div>
                <Button className="w-full h-14 bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-lg shadow-orange-500/20 font-bold text-lg">
                  进入投票通道
                </Button>
              </div>
            </div>

            {/* Live Chat */}
            <div className="relative rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-blue-950/30 p-8 border border-blue-200 dark:border-blue-900/50 shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex flex-col h-full justify-between">
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-4 rounded-xl bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                      <MessageSquare className="h-7 w-7" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">实时聊天室</h3>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-base mb-8 leading-relaxed">
                    目前已有 <span className="text-blue-600 dark:text-blue-400 font-bold text-lg">12,492</span> 人在房间内。与全球死忠球迷一起看球侃球、分享激情。
                  </p>
                </div>
                <Button className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/20 font-bold text-lg">
                  加入🔥热聊大厅
                </Button>
              </div>
            </div>

            {/* Predictions */}
            <div className="relative rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-slate-900 dark:to-emerald-950/30 p-8 border border-emerald-200 dark:border-emerald-900/50 shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex flex-col h-full justify-between">
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-4 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                      <Target className="h-7 w-7" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">赛事竞猜</h3>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-base mb-8 leading-relaxed">
                    预测首发阵容、首个进球者以及最终比分。赢取社区积分兑换实体球队周边！
                  </p>
                </div>
                <Button className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-500/20 font-bold text-lg">
                  参与竞猜赢大奖
                </Button>
              </div>
            </div>

          </div>
        </section>

      </div>
    </main>
  );
}
