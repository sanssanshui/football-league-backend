"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { Menu, X, User as UserIcon, LogOut, Sun, Moon, ChevronDown } from "lucide-react";
import { useTheme } from "next-themes";
import { useUserStore } from "@/lib/store";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navbar() {
    const pathname = usePathname();
    const { scrollY } = useScroll();
    const [isScrolled, setIsScrolled] = useState(false);
    const [hidden, setHidden] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    const { username, avatar_url, logout } = useUserStore();
    const { theme, setTheme } = useTheme();

    useEffect(() => {
        setMounted(true);
    }, []);

    useMotionValueEvent(scrollY, "change", (latest) => {
        const previous = scrollY.getPrevious() ?? 0;
        // Auto-hide when scrolling down past 150px
        if (latest > 150 && latest > previous) {
            setHidden(true);
        } else {
            setHidden(false);
        }
        setIsScrolled(latest > 50);
    });

    const isAuthPage = pathname === "/auth";

    const navLinks = [
        { name: "赛事概览", href: "/matches" },
        { name: "最新资讯", href: "/news" },
        { name: "球迷社区", href: "/community" },
    ];

    return (
        <motion.nav
            variants={{
                visible: { y: 0 },
                hidden: { y: "-100%" },
            }}
            animate={hidden ? "hidden" : "visible"}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            onHoverStart={() => setHidden(false)}
            onFocus={() => setHidden(false)}
            className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${isScrolled ? "bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-gray-200 dark:border-white/10 shadow-sm" : "bg-transparent text-white"}`}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-20">
                    {/* LOGO & DROPDOWN */}
                    <div className="flex-shrink-0">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="font-black text-2xl tracking-wider flex items-center gap-2 outline-none group">
                                    <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
                                        <span className="text-white text-sm font-bold">FL</span>
                                    </div>
                                    <span className={`hidden sm:flex items-center gap-1 ${isScrolled ? 'text-gray-900 dark:text-white' : 'text-white'}`}>
                                        足球联盟
                                        <ChevronDown className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                                    </span>
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-56 mt-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-gray-100 dark:border-white/10 shadow-xl rounded-xl">
                                <DropdownMenuLabel className="font-bold text-emerald-600 dark:text-emerald-400">探索生态</DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-gray-100 dark:bg-white/5" />
                                <DropdownMenuItem asChild className="focus:bg-gray-50 dark:focus:bg-slate-800 cursor-pointer text-base py-2">
                                    <Link href="/">联盟首页</Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild className="focus:bg-gray-50 dark:focus:bg-slate-800 cursor-pointer text-base py-2">
                                    <Link href="/matches">看门道：赛事大厅</Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild className="focus:bg-gray-50 dark:focus:bg-slate-800 cursor-pointer text-base py-2">
                                    <Link href="/community">凑热闹：球迷广场</Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-gray-100 dark:bg-white/5" />
                                <DropdownMenuItem asChild className="focus:bg-orange-50 dark:focus:bg-orange-900/20 cursor-pointer text-base py-2 text-orange-600 dark:text-orange-400 font-medium">
                                    <Link href="/vip">升级钻石 VIP 图标</Link>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* DESKTOP LINKS */}
                    <div className="hidden md:block">
                        <div className="ml-10 flex items-baseline space-x-8">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.name}
                                    href={link.href}
                                    className={`${pathname === link.href ? 'text-emerald-500 font-bold' : isScrolled ? 'text-gray-600 hover:text-emerald-600 dark:text-gray-300 dark:hover:text-white' : 'text-gray-200 hover:text-white'} px-3 py-2 rounded-md text-sm font-medium tracking-wide transition-colors relative group`}
                                >
                                    {link.name}
                                    {pathname !== link.href && (
                                        <span className="absolute inset-x-0 bottom-0 h-0.5 bg-emerald-500 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left rounded-full" />
                                    )}
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* RIGHT ACTIONS */}
                    <div className="hidden md:flex items-center gap-4">
                        {mounted && username ? (
                            <div className="flex items-center gap-4 bg-gray-100/50 dark:bg-slate-800/50 px-4 py-1.5 rounded-full border border-gray-200/50 dark:border-white/5">
                                {/* 修改点1：用 Link 包裹头像和用户名，点击跳转到 /profile */}
                                <Link href="/profile" className="flex items-center gap-2 group cursor-pointer">
                                    {avatar_url ? (
                                        <img src={avatar_url} alt="Avatar" className="w-8 h-8 rounded-full object-cover border-2 border-emerald-500/50 group-hover:border-emerald-500 transition-colors" />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-sm shadow-sm group-hover:scale-105 transition-transform">
                                            {username.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <span className={`${isScrolled ? 'text-gray-800 dark:text-white' : 'text-white'} font-semibold tracking-wide`}>{username}</span>
                                </Link>
                                <button
                                    onClick={logout}
                                    className="p-1.5 rounded-full text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30 transition-all"
                                    title="安全的退出登录"
                                >
                                    <LogOut size={16} />
                                </button>
                            </div>
                        ) : (
                            mounted && !isAuthPage && (
                                <Link
                                    href="/auth"
                                    className="text-white bg-emerald-500 hover:bg-emerald-600 px-6 py-2 rounded-full text-sm font-bold tracking-wide transition-transform hover:scale-105 flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                                >
                                    <UserIcon size={16} />
                                    加入联盟
                                </Link>
                            )
                        )}

                        {mounted && (
                            <button
                                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                                className={`ml-2 p-2.5 rounded-full transition-all duration-300 ${isScrolled ? 'bg-gray-100 text-amber-500 hover:bg-gray-200 dark:bg-slate-800 dark:text-blue-400 dark:hover:bg-slate-700' : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-md'}`}
                                title="切换日夜主题"
                            >
                                {theme === 'dark' ? <Moon size={18} className="animate-in fade-in zoom-in spin-in-180" /> : <Sun size={18} className="animate-in fade-in zoom-in spin-in-180" />}
                            </button>
                        )}
                    </div>

                    {/* MOBILE MENU TOGGLE */}
                    <div className="-mr-2 flex md:hidden">
                        {mounted && (
                            <button
                                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                                className={`mr-2 p-2 rounded-full transition-all ${isScrolled ? 'text-amber-500 dark:text-blue-400' : 'text-white'}`}
                            >
                                {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
                            </button>
                        )}
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className={`inline-flex items-center justify-center p-2 rounded-md focus:outline-none transition-colors ${isScrolled ? 'text-gray-600 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-white' : 'text-gray-200 hover:text-white'}`}
                        >
                            <span className="sr-only">打开主菜单</span>
                            {isMobileMenuOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* MOBILE MENU */}
            {isMobileMenuOpen && (
                <div className="md:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl absolute top-20 left-0 w-full border-b border-gray-200 dark:border-white/10 shadow-2xl">
                    <div className="px-4 pt-4 pb-6 space-y-2">
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                href={link.href}
                                className={`block px-4 py-3 rounded-xl text-base font-medium tracking-wide transition-colors ${pathname === link.href ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                {link.name}
                            </Link>
                        ))}

                        <div className="h-px bg-gray-100 dark:bg-white/5 my-4" />

                        {mounted && username ? (
                            <div className="space-y-3">
                                {/* 修改点2：将用户名所在的 div 改为 Link，点击跳转到 /profile 并关闭菜单 */}
                                <Link
                                    href="/profile"
                                    className="text-gray-900 dark:text-white px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-800 text-base font-bold flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                                        {username.charAt(0).toUpperCase()}
                                    </div>
                                    {username}
                                </Link>
                                <button
                                    onClick={() => {
                                        logout();
                                        setIsMobileMenuOpen(false);
                                    }}
                                    className="text-red-600 dark:text-red-400 block px-4 py-3 rounded-xl text-base font-bold w-full text-left hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                >
                                    退出登录
                                </button>
                            </div>
                        ) : (
                            mounted && !isAuthPage && (
                                <Link
                                    href="/auth"
                                    className="text-white bg-emerald-500 block px-4 py-4 rounded-xl text-base font-bold tracking-wide mt-4 text-center shadow-md hover:bg-emerald-600 transition-colors"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    加入联盟
                                </Link>
                            )
                        )}
                    </div>
                </div>
            )}
        </motion.nav>
    );
}