"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useUserStore } from "@/lib/store";

const API = "http://localhost:5002";

interface OrderDetail {
  id: number;
  total_amount: string;
  status: string;
  alipay_trade_no: string | null;
  alipay_out_trade_no: string | null;
  createdAt: string;
  updatedAt: string;
  orderItems: {
    id: number;
    quantity: number;
    price: string;
    product: { id: number; name: string; description: string; category: string; price: string };
  }[];
}

const STATUS_STYLE: Record<string, string> = {
  待支付: "bg-orange-500/20 border-orange-500/40 text-orange-400",
  已支付: "bg-[#008000]/20 border-[#008000]/40 text-[#00ff00]",
  已取消: "bg-white/10 border-white/20 text-white/40",
};

const CATEGORY_EMOJI: Record<string, string> = {
  球衣: "👕", 围巾: "🧣", 帽子: "🧢", 配件: "📿", 纪念品: "🏆",
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useUserStore();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { router.replace("/auth"); return; }
    const id = params.id;
    if (!id) return;
    fetch(`${API}/api/order/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((json) => { if (json.code === 200) setOrder(json.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params.id, token]);

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-[#008000] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!order) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white gap-4">
      <p className="text-white/50">订单不存在</p>
      <Link href="/order/list" className="text-[#00ff00] hover:underline">返回订单列表</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white font-sans relative">
      <div className="fixed inset-0 z-0 bg-cover bg-center opacity-20"
        style={{ backgroundImage: "url('/images/pexels-eslames1-31160101.jpg')" }} />
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-black/90 via-black/70 to-black/95" />

      <div className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-white/10 bg-black/30 backdrop-blur-xl sticky top-0">
        <button onClick={() => router.back()}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm transition-all">
          <ArrowLeft className="w-4 h-4" /> 返回
        </button>
        <h1 className="text-xl font-bold">订单详情</h1>
        <div className="w-24" />
      </div>

      <div className="relative z-10 max-w-[700px] mx-auto px-6 py-8 space-y-5">
        {/* Status */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-black/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 flex items-center justify-between">
          <div>
            <p className="text-white/40 text-xs mb-1">订单号 #{order.id}</p>
            <p className="text-white/30 text-xs">{new Date(order.createdAt).toLocaleString("zh-CN")}</p>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-semibold border ${STATUS_STYLE[order.status] || STATUS_STYLE["待支付"]}`}>
            {order.status}
          </span>
        </motion.div>

        {/* Items */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-black/50 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10">
            <h3 className="text-white font-semibold">商品明细</h3>
          </div>
          <div className="divide-y divide-white/5">
            {order.orderItems.map((item) => (
              <div key={item.id} className="flex items-center gap-4 px-6 py-4">
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-2xl shrink-0">
                  {CATEGORY_EMOJI[item.product.category] || "🛍️"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm">{item.product.name}</p>
                  <p className="text-white/40 text-xs mt-0.5">单价 ¥{Number(item.price).toFixed(2)} × {item.quantity}</p>
                </div>
                <span className="text-white font-semibold shrink-0">
                  ¥{(Number(item.price) * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Payment info */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-black/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-3">
          <h3 className="text-white font-semibold mb-4">支付信息</h3>
          <div className="flex justify-between text-sm">
            <span className="text-white/50">支付方式</span>
            <span className="text-white">支付宝</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-white/50">订单金额</span>
            <span className="text-[#ff6700] font-bold text-lg">¥{Number(order.total_amount).toFixed(2)}</span>
          </div>
          {order.alipay_out_trade_no && (
            <div className="flex justify-between text-sm">
              <span className="text-white/50">商户订单号</span>
              <span className="text-white/60 font-mono text-xs">{order.alipay_out_trade_no}</span>
            </div>
          )}
          {order.alipay_trade_no && (
            <div className="flex justify-between text-sm">
              <span className="text-white/50">支付宝流水号</span>
              <span className="text-white/60 font-mono text-xs">{order.alipay_trade_no}</span>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
