"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Clock, ShoppingBag, RotateCcw, Search, LogIn, User } from "lucide-react";
import { useUserStore } from "@/lib/store";
import { apiFetch } from "@/lib/api";

export default function PaymentResultPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, username } = useUserStore();
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState<"loading" | "success" | "pending" | "failed">("loading");
  const [orderId, setOrderId] = useState<number | null>(null);

  useEffect(() => { setMounted(true); }, []);

  const checkStatus = useCallback(async (outTradeNo: string, tradeStatus?: string | null) => {
    if (!token) { setStatus("failed"); return; }
    try {
      const ordersJson = await apiFetch("/api/shop/orders");
      if (ordersJson.code !== 200) { setStatus("failed"); return; }

      const order = ordersJson.data.find((o: any) => o.out_trade_no === outTradeNo);
      if (!order) { setStatus("failed"); return; }

      setOrderId(order.id);

      // If Alipay already told us the status via URL param, use it directly
      if (tradeStatus === "TRADE_SUCCESS" || tradeStatus === "TRADE_FINISHED") {
        // Still call backend to persist the PAID status
        await apiFetch(`/api/shop/pay/status/${order.id}`);
        setStatus("success");
        return;
      }

      const statusJson = await apiFetch(`/api/shop/pay/status/${order.id}`);
      if (statusJson.code === 200) {
        const s = statusJson.data.status;
        if (s === "PAID" || s === "COMPLETED") setStatus("success");
        else if (s === "PENDING") setStatus("pending");
        else setStatus("failed");
      } else {
        setStatus("failed");
      }
    } catch {
      setStatus("failed");
    }
  }, [token]);

  useEffect(() => {
    if (!mounted) return;
    const outTradeNo = searchParams?.get("out_trade_no");
    const tradeStatus = searchParams?.get("trade_status");
    if (outTradeNo) {
      checkStatus(outTradeNo, tradeStatus);
    } else {
      setStatus("failed");
    }
  }, [mounted, searchParams, checkStatus]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-[#0a0a0a] to-[#111] text-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 w-full h-[68px] bg-black/30 backdrop-blur-xl border-b border-white/10">
        <div className="w-full max-w-[1200px] h-full mx-auto flex items-center justify-between px-4">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-[17px] text-white/75 hover:text-white transition-all">首页</Link>
            <Link href="/matches" className="text-[17px] text-white/75 hover:text-white transition-all">赛事</Link>
            <Link href="/teams" className="text-[17px] text-white/75 hover:text-white transition-all">球员球队</Link>
            <Link href="/community?tab=quiz" className="text-[17px] text-white/75 hover:text-white transition-all">互动</Link>
            <Link href="/shop" className="text-[17px] border-b-2 border-[#00ff00] text-white transition-all">周边商城</Link>
            <Link href="/analysis/upload" className="text-[17px] text-white/75 hover:text-white transition-all">视频分析</Link>
          </div>
          <div className="flex items-center gap-5">
            <div className="w-[260px] h-[36px] bg-white/10 rounded-full flex items-center border border-white/20 overflow-hidden">
              <input type="text" placeholder="搜索比赛、球队、球员..."
                className="w-full h-full bg-transparent outline-none px-4 text-[13px] text-white placeholder:text-white/40" />
              <Search className="w-4 h-4 text-white/40 mr-3 shrink-0" />
            </div>
            <Link href="/auth" className="flex items-center gap-1 text-white/75 hover:text-white text-[15px] transition-all whitespace-nowrap">
              <LogIn className="w-4 h-4" /> 登录
            </Link>
            <Link href="/profile" className="flex items-center gap-1 text-white/75 hover:text-white text-[15px] transition-all whitespace-nowrap">
              <User className="w-4 h-4" /> {username || '个人中心'}
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="flex items-center justify-center px-4 py-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-sm w-full bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center"
        >
          {status === "loading" && (
            <>
              <div className="w-16 h-16 border-2 border-[#008000] border-t-transparent rounded-full animate-spin mx-auto mb-6" />
              <h2 className="text-xl font-bold mb-2">正在确认支付结果</h2>
              <p className="text-white/50 text-sm">请稍候...</p>
            </>
          )}

          {status === "success" && (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="w-20 h-20 bg-[#008000]/20 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <CheckCircle size={40} className="text-[#00ff00]" />
              </motion.div>
              <h2 className="text-2xl font-bold mb-2 text-[#00ff00]">支付成功！</h2>
              <p className="text-white/50 text-sm mb-8">感谢您的购买，商品将尽快为您发货。</p>
              <div className="space-y-3">
                {orderId && (
                  <button
                    onClick={() => router.push(`/shop/orders/${orderId}`)}
                    className="w-full bg-gradient-to-r from-[#008000] to-[#00b300] hover:shadow-[0_4px_20px_rgba(0,128,0,0.4)] text-white py-3 rounded-xl font-medium transition-all"
                  >
                    查看订单
                  </button>
                )}
                <button
                  onClick={() => router.push("/shop")}
                  className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <ShoppingBag size={16} /> 继续购物
                </button>
              </div>
            </>
          )}

          {status === "pending" && (
            <>
              <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock size={40} className="text-yellow-400" />
              </div>
              <h2 className="text-2xl font-bold mb-2 text-yellow-400">支付处理中</h2>
              <p className="text-white/50 text-sm mb-8">支付结果正在确认中，请稍后查看订单状态。</p>
              <div className="space-y-3">
                {orderId && (
                  <button
                    onClick={() => router.push(`/shop/orders/${orderId}`)}
                    className="w-full bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 text-yellow-400 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <RotateCcw size={16} /> 刷新订单状态
                  </button>
                )}
                <button
                  onClick={() => router.push("/shop/orders")}
                  className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white py-3 rounded-xl font-medium transition-colors"
                >
                  查看所有订单
                </button>
              </div>
            </>
          )}

          {status === "failed" && (
            <>
              <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle size={40} className="text-red-400" />
              </div>
              <h2 className="text-2xl font-bold mb-2 text-red-400">支付失败</h2>
              <p className="text-white/50 text-sm mb-8">支付未完成或已取消，您可以重新发起支付。</p>
              <div className="space-y-3">
                <button
                  onClick={() => router.push("/shop/orders")}
                  className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white py-3 rounded-xl font-medium transition-colors"
                >
                  查看订单
                </button>
                <button
                  onClick={() => router.push("/shop")}
                  className="w-full bg-[#008000]/20 hover:bg-[#008000]/30 border border-[#008000]/30 text-[#00ff00] py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <ShoppingBag size={16} /> 返回商城
                </button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
