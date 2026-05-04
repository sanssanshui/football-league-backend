"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Package } from "lucide-react";
import { useUserStore } from "@/lib/store";

const API = "http://localhost:5002";

interface Order {
  id: number;
  total_amount: string;
  status: string;
  createdAt: string;
  alipay_out_trade_no: string | null;
  orderItems: {
    id: number;
    quantity: number;
    price: string;
    product: { id: number; name: string; category: string };
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

export default function OrderListPage() {
  const router = useRouter();
  const { token } = useUserStore();
  const [mounted, setMounted] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    if (!token) { router.replace("/auth"); return; }
    fetch(`${API}/api/order/list`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((json) => { if (json.code === 200) setOrders(json.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (!mounted) return null;

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
        <h1 className="text-xl font-bold">我的订单</h1>
        <Link href="/store" className="text-white/50 hover:text-white text-sm transition-colors">去购物</Link>
      </div>

      <div className="relative z-10 max-w-[800px] mx-auto px-6 py-8 space-y-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-2 border-[#008000] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center py-24 gap-6">
            <Package className="w-16 h-16 text-white/20" />
            <p className="text-white/40 text-lg">暂无订单</p>
            <Link href="/store"
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#008000] to-[#00b300] text-white font-semibold hover:shadow-[0_0_20px_rgba(0,128,0,0.4)] transition-all">
              去购物
            </Link>
          </div>
        ) : orders.map((order, i) => (
          <motion.div key={order.id}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-black/50 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all">
            {/* Order header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <div>
                <span className="text-white/40 text-xs">订单号 #{order.id}</span>
                <p className="text-white/30 text-xs mt-0.5">
                  {new Date(order.createdAt).toLocaleString("zh-CN")}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_STYLE[order.status] || STATUS_STYLE["待支付"]}`}>
                {order.status}
              </span>
            </div>

            {/* Items preview */}
            <div className="px-6 py-4">
              <div className="flex gap-2 mb-3">
                {order.orderItems.slice(0, 4).map((item) => (
                  <div key={item.id} className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-xl">
                    {CATEGORY_EMOJI[item.product.category] || "🛍️"}
                  </div>
                ))}
                {order.orderItems.length > 4 && (
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-white/40 text-xs">
                    +{order.orderItems.length - 4}
                  </div>
                )}
              </div>
              <p className="text-white/50 text-xs">
                {order.orderItems.map((i) => `${i.product.name.slice(0, 8)}... ×${i.quantity}`).join("、")}
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-white/5">
              <span className="text-white/40 text-sm">共 {order.orderItems.length} 件</span>
              <div className="flex items-center gap-4">
                <span className="text-[#ff6700] font-bold">¥{Number(order.total_amount).toFixed(2)}</span>
                <Link href={`/order/${order.id}`}
                  className="px-4 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white text-xs hover:bg-white/20 transition-all">
                  查看详情
                </Link>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
