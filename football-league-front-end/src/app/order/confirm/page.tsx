"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, CreditCard } from "lucide-react";
import { useUserStore } from "@/lib/store";

const API = "http://localhost:5002";

interface CartItem {
  id: number;
  quantity: number;
  product: { id: number; name: string; price: string; category: string };
}

const CATEGORY_EMOJI: Record<string, string> = {
  球衣: "👕", 围巾: "🧣", 帽子: "🧢", 配件: "📿", 纪念品: "🏆",
};

export default function OrderConfirmPage() {
  const router = useRouter();
  const { token } = useUserStore();
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setMounted(true);
    if (!token) { router.replace("/auth"); return; }
    fetch(`${API}/api/cart`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((json) => { if (json.code === 200) setItems(json.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const total = items.reduce((sum, i) => sum + Number(i.product.price) * i.quantity, 0);

  const handleSubmit = async () => {
    if (items.length === 0) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/order/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.code === 200 && json.data?.payUrl) {
        window.location.href = json.data.payUrl;
      } else {
        setError(json.message || "创建订单失败，请重试");
      }
    } catch {
      setError("网络错误，请重试");
    } finally {
      setSubmitting(false);
    }
  };

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
        <h1 className="text-xl font-bold">确认订单</h1>
        <div className="w-24" />
      </div>

      <div className="relative z-10 max-w-[700px] mx-auto px-6 py-8 space-y-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-2 border-[#008000] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Items */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="bg-black/50 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-white/10">
                <h3 className="text-white font-semibold">商品清单</h3>
              </div>
              <div className="divide-y divide-white/5">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 px-6 py-4">
                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-xl shrink-0">
                      {CATEGORY_EMOJI[item.product.category] || "🛍️"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{item.product.name}</p>
                      <p className="text-white/40 text-xs">×{item.quantity}</p>
                    </div>
                    <span className="text-white font-semibold text-sm shrink-0">
                      ¥{(Number(item.product.price) * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Payment info */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-black/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <h3 className="text-white font-semibold mb-4">支付方式</h3>
              <div className="flex items-center gap-3 p-4 rounded-xl bg-[#1677ff]/10 border border-[#1677ff]/30">
                <div className="w-10 h-10 rounded-lg bg-[#1677ff] flex items-center justify-center text-white font-bold text-sm">支</div>
                <div>
                  <p className="text-white font-medium text-sm">支付宝</p>
                  <p className="text-white/40 text-xs">沙箱测试环境 · 无真实扣款</p>
                </div>
                <div className="ml-auto w-4 h-4 rounded-full border-2 border-[#1677ff] flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-[#1677ff]" />
                </div>
              </div>
            </motion.div>

            {/* Total */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="bg-black/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <div className="flex justify-between items-center">
                <span className="text-white/60">共 {items.length} 件商品</span>
                <div className="text-right">
                  <p className="text-white/40 text-xs">应付金额</p>
                  <p className="text-[#ff6700] font-bold text-3xl">¥{total.toFixed(2)}</p>
                </div>
              </div>
            </motion.div>

            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button onClick={handleSubmit}
              disabled={submitting || items.length === 0}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#1677ff] to-[#0958d9] text-white font-bold text-lg hover:shadow-[0_0_30px_rgba(22,119,255,0.5)] transition-all disabled:opacity-50 flex items-center justify-center gap-3">
              <CreditCard className="w-5 h-5" />
              {submitting ? "正在跳转支付宝..." : "提交订单并支付"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
