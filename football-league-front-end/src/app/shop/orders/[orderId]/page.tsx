"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronLeft, Clock, CheckCircle, XCircle, Truck, MapPin, CreditCard, Search, LogIn, User } from "lucide-react";
import { useUserStore } from "@/lib/store";
import { apiFetch } from "@/lib/api";

interface Order {
  id: number;
  out_trade_no: string;
  alipay_trade_no: string | null;
  total_amount: string;
  status: string;
  address_snapshot: string;
  createdAt: string;
  orderItems: {
    id: number;
    quantity: number;
    unit_price: string;
    product_snapshot: string;
  }[];
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  PENDING: { label: "待支付", color: "text-yellow-400", bg: "bg-yellow-500/20 border-yellow-500/30", icon: <Clock size={16} /> },
  PAID: { label: "已支付", color: "text-[#00ff00]", bg: "bg-[#008000]/20 border-[#008000]/30", icon: <CheckCircle size={16} /> },
  SHIPPED: { label: "已发货", color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/20", icon: <Truck size={16} /> },
  COMPLETED: { label: "已完成", color: "text-[#00ff00]", bg: "bg-[#008000]/20 border-[#008000]/30", icon: <CheckCircle size={16} /> },
  CANCELLED: { label: "已取消", color: "text-red-400", bg: "bg-red-500/20 border-red-500/30", icon: <XCircle size={16} /> },
};

function OrderDetailContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { token, username } = useUserStore();
  const [mounted, setMounted] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  const isNew = searchParams?.get("new") === "1";
  const autoPay = searchParams?.get("pay") === "1";

  useEffect(() => { setMounted(true); }, []);

  const fetchOrder = useCallback(async () => {
    if (!token || !params?.orderId) return;
    try {
      const json = await apiFetch(`/api/shop/orders/${params.orderId}`);
      if (json.code === 200) setOrder(json.data);
    } catch {}
    finally { setLoading(false); }
  }, [token, params?.orderId]);

  useEffect(() => {
    if (mounted && !token) { router.push("/auth"); return; }
    if (mounted) fetchOrder();
  }, [mounted, token, fetchOrder, router]);

  const handlePay = async () => {
    if (!token || !order) return;
    setPaying(true);
    try {
      const json = await apiFetch(`/api/shop/pay/${order.id}`, { method: "POST" });
      if (json.code === 200 && json.data.payUrl) {
        window.location.href = json.data.payUrl;
      } else {
        alert(json.message || "获取支付链接失败");
      }
    } catch (e: any) {
      if (!e.message?.includes("未登录")) alert("网络错误");
    } finally {
      setPaying(false);
    }
  };

  useEffect(() => {
    if (autoPay && order && order.status === "PENDING" && !paying) {
      handlePay();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPay, order]);

  if (!mounted) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-[#0a0a0a] to-[#111] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#008000] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-[#0a0a0a] to-[#111] flex flex-col items-center justify-center text-white/40">
        <p>订单不存在</p>
        <button onClick={() => router.push("/shop/orders")} className="mt-4 text-[#00ff00] hover:underline text-sm">返回订单列表</button>
      </div>
    );
  }

  const statusInfo = STATUS_MAP[order.status] || { label: order.status, color: "text-white/60", bg: "bg-black/40 border-white/10", icon: null };
  const addressData = JSON.parse(order.address_snapshot);

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

      {/* Sub-header */}
      <div className="w-full max-w-2xl mx-auto px-4 pt-6 pb-2 flex items-center gap-4">
        <button onClick={() => router.push("/shop/orders")} className="flex items-center gap-1 text-white/60 hover:text-white transition-colors">
          <ChevronLeft size={18} />
          <span className="text-sm">我的订单</span>
        </button>
        <span className="font-bold text-lg">订单详情</span>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {isNew && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#008000]/20 border border-[#008000]/30 rounded-xl p-4 text-center text-[#00ff00] text-sm"
          >
            订单创建成功！请尽快完成支付。
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`border rounded-2xl p-5 ${statusInfo.bg}`}
        >
          <div className={`flex items-center gap-2 text-lg font-bold ${statusInfo.color}`}>
            {statusInfo.icon} {statusInfo.label}
          </div>
          <p className="text-xs text-white/40 mt-1">订单号：{order.out_trade_no}</p>
          {order.alipay_trade_no && (
            <p className="text-xs text-white/40">支付宝流水号：{order.alipay_trade_no}</p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5"
        >
          <h3 className="font-semibold flex items-center gap-2 mb-3">
            <MapPin size={14} className="text-[#00ff00]" /> 收货信息
          </h3>
          <p className="text-sm text-white">{addressData.receiver} <span className="text-white/50 ml-2">{addressData.phone}</span></p>
          <p className="text-sm text-white/60 mt-1">{addressData.address}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5"
        >
          <h3 className="font-semibold mb-3">商品清单</h3>
          <div className="space-y-3">
            {order.orderItems.map((item) => {
              const snapshot = JSON.parse(item.product_snapshot);
              return (
                <div key={item.id} className="flex items-center gap-3">
                  <img
                    src={snapshot.image_url || `https://placehold.co/48x48/0a0a0a/444?text=No+Image`}
                    alt={snapshot.name}
                    className="w-12 h-12 rounded-lg object-cover bg-black/60 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white line-clamp-1">{snapshot.name}</p>
                    <p className="text-xs text-white/40">¥{Number(item.unit_price).toFixed(2)} × {item.quantity}</p>
                  </div>
                  <p className="text-sm text-[#00ff00] font-medium flex-shrink-0">
                    ¥{(Number(item.unit_price) * item.quantity).toFixed(2)}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between font-bold text-base border-t border-white/10 pt-3 mt-3">
            <span>实付金额</span>
            <span className="text-[#00ff00]">¥{Number(order.total_amount).toFixed(2)}</span>
          </div>
        </motion.div>

        {order.status === "PENDING" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
            <button
              onClick={handlePay}
              disabled={paying}
              className="w-full bg-gradient-to-r from-[#008000] to-[#00b300] hover:shadow-[0_4px_20px_rgba(0,128,0,0.4)] disabled:opacity-50 text-white py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2"
            >
              <CreditCard size={20} />
              {paying ? "跳转支付宝中..." : `支付宝支付 ¥${Number(order.total_amount).toFixed(2)}`}
            </button>
            <p className="text-center text-xs text-white/30 mt-2">将跳转至支付宝沙箱完成支付</p>
          </motion.div>
        )}

        <p className="text-center text-xs text-white/30">
          下单时间：{new Date(order.createdAt).toLocaleString("zh-CN")}
        </p>
      </main>
    </div>
  );
}

export default function OrderDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#008000] border-t-transparent rounded-full animate-spin" /></div>}>
      <OrderDetailContent />
    </Suspense>
  );
}
