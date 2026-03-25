import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar"; // 引入客户端组件
import { ThemeProvider } from "@/components/theme-provider";
import FootballAiChat from "@/components/FootballAiChat"; 
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Football League",
  description: "The ultimate football community and live tracker.",
};

// 标准的默认导出：React 组件函数
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased selection:bg-emerald-500/30 transition-colors duration-300`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Navbar /> {/* 渲染 Navbar，隐藏逻辑已移至组件内部 */}
          {children}
          {/* 新增：AI助手全局悬浮组件 */}
          <FootballAiChat />
        </ThemeProvider>
      </body>
    </html>
  );
}