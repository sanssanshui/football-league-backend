"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronLeft, Package, Clock, CheckCircle, XCircle, Truck, Search, LogIn, User } from "lucide-react";
import { useUserStore } from "@/lib/store";
import { apiFetch } from "@/lib/api";

interface Order {
  id: number;
  out_trade_no: string;
  total_amount: string;
  status: string;
  createdAt: string;
  orderItems: { id: number; quantity: number; unit_price: string; product_snapshot: string }[];
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING: { label: "待支付", color: "text-yellow-400", icon: <Clock size={14} /> },
  PAID: { label: "已支付", color: "text-[#00ff00]", icon: <CheckCircle size={14} /> },
  SHIPPED: { label: "已发货", color: "text-blue-400", icon: <Truck size={14} /> },
  COMPLETED: { label: "已完成", color: "text-[#00ff00]", icon: <CheckCircle size={14} /> },
  CANCELLED: { label: "已取消", color: "text-white/40", icon: <XCircle size={14} /> },
};

export default function OrdersPage() {
  const router = useRouter();
  const { token, username } = useUserStore();
  const [mounted, setMounted] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setMounted(true); }, []);

  const fetchOrders = useCallback(async () => {
    if (!token) return;
    try {
      const json = await apiFetch("/api/shop/orders");
      if (json.code === 200) setOrders(json.data);
    } catch {}
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => {
    if (mounted && !token) { router.push("/auth"); return; }
    if (mounted) fetchOrders();
  }, [mounted, token, fetchOrders, router]);

  if (!mounted) return null;

  return (
    <div className="relative min-h-screen text-white">
      <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/images/pexels-markusspiske-114296.jpg')" }} />
      <div className="fixed inset-0 z-0 bg-black/70" />
      {/* Navbar */}
      <nav className="sticky top-0 z-50 w-full h-[68px] bg-black/30 backdrop-blur-xl border-b border-white/10">
        <div className="w-full max-w-[1200px] h-full mx-auto flex items-center justify-between px-4">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-[17px] text-white/75 hover:text-white transition-all">首页</Link>
            <Link href="/matches" className="text-[17px] text-white/75 hover:text-white transition-all">赛事</Link>
            <Link href="/teams" className="text-[17px] text-white/75 hover:text-white transition-all">球员/球队</Link>
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

      {/* Sub-header */}
      <div className="w-full max-w-3xl mx-auto px-4 pt-6 pb-2 flex items-center gap-4">
        <button onClick={() => router.push("/shop")} className="flex items-center gap-1 text-white/60 hover:text-white transition-colors">
          <ChevronLeft size={18} />
          <span className="text-sm">商城</span>
        </button>
        <span className="font-bold text-lg">我的订单</span>
      </div>

      <main className="relative z-10 max-w-3xl mx-auto px-4 py-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-32 bg-white/5 rounded-xl animate-pulse" />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 text-white/20">
            <Package size={48} className="mx-auto mb-4 opacity-30" />
            <p className="mb-4">暂无订单</p>
            <button onClick={() => router.push("/shop")} className="text-[#00ff00] hover:underline text-sm">去购物</button>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order, i) => {
              const statusInfo = STATUS_MAP[order.status] || { label: order.status, color: "text-white/60", icon: null };
              const firstItem = order.orderItems[0];
              const snapshot = firstItem ? JSON.parse(firstItem.product_snapshot) : null;

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => router.push(`/shop/orders/${order.id}`)}
                  className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-4 cursor-pointer hover:border-[#008000]/30 hover:bg-black/60 transition-all"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-white/40">订单号：{order.out_trade_no}</span>
                    <span className={`flex items-center gap-1 text-xs font-medium ${statusInfo.color}`}>
                      {statusInfo.icon} {statusInfo.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {snapshot && (
                      <img
                        src={snapshot.image_url || `https://placehold.co/56x56/0a0a0a/444?text=No+Image`}
                        alt={snapshot.name}
                        className="w-14 h-14 rounded-lg object-cover bg-black/60 flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white line-clamp-1">{snapshot?.name || "商品"}</p>
                      {order.orderItems.length > 1 && (
                        <p className="text-xs text-white/40">等 {order.orderItems.length} 件商品</p>
                      )}
                      <p className="text-xs text-white/40 mt-1">{new Date(order.createdAt).toLocaleString("zh-CN")}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[#00ff00] font-bold">¥{Number(order.total_amount).toFixed(2)}</p>
                    </div>
                  </div>
                  {order.status === "PENDING" && (
                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={(e) => { e.stopPropagation(); router.push(`/shop/orders/${order.id}?pay=1`); }}
                        className="bg-gradient-to-r from-[#008000] to-[#00b300] hover:shadow-[0_4px_20px_rgba(0,128,0,0.4)] text-white text-xs px-4 py-1.5 rounded-lg transition-all"
                      >
                        去支付
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
