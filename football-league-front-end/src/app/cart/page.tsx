"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Minus, Trash2, ShoppingBag } from "lucide-react";
import { useUserStore } from "@/lib/store";

const API = "http://localhost:5002";

interface CartItem {
  id: number;
  quantity: number;
  product: {
    id: number;
    name: string;
    price: string;
    image_url: string | null;
    stock: number;
    category: string;
  };
}

const CATEGORY_EMOJI: Record<string, string> = {
  球衣: "👕", 围巾: "🧣", 帽子: "🧢", 配件: "📿", 纪念品: "🏆",
};

export default function CartPage() {
  const router = useRouter();
  const { token } = useUserStore();
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    if (!token) { router.replace("/auth"); return; }
    loadCart();
  }, [token]);

  const loadCart = async () => {
    try {
      const res = await fetch(`${API}/api/cart`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.code === 200) setItems(json.data);
    } catch {} finally { setLoading(false); }
  };

  const updateQty = async (productId: number, quantity: number) => {
    if (quantity <= 0) { removeItem(productId); return; }
    setItems((prev) => prev.map((i) => i.product.id === productId ? { ...i, quantity } : i));
    await fetch(`${API}/api/cart/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ quantity }),
    });
  };

  const removeItem = async (productId: number) => {
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
    await fetch(`${API}/api/cart/${productId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  const total = items.reduce((sum, i) => sum + Number(i.product.price) * i.quantity, 0);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-black text-white font-sans relative">
      <div className="fixed inset-0 z-0 bg-cover bg-center opacity-20"
        style={{ backgroundImage: "url('/images/pexels-eslames1-31160101.jpg')" }} />
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-black/90 via-black/70 to-black/95" />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-white/10 bg-black/30 backdrop-blur-xl sticky top-0">
        <button onClick={() => router.back()}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm transition-all">
          <ArrowLeft className="w-4 h-4" /> 返回
        </button>
        <h1 className="text-xl font-bold">购物车 {items.length > 0 && `(${items.length})`}</h1>
        <Link href="/store" className="text-white/50 hover:text-white text-sm transition-colors">继续购物</Link>
      </div>

      <div className="relative z-10 max-w-[900px] mx-auto px-6 py-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-2 border-[#008000] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-24 gap-6">
            <ShoppingBag className="w-16 h-16 text-white/20" />
            <p className="text-white/40 text-lg">购物车是空的</p>
            <Link href="/store"
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#008000] to-[#00b300] text-white font-semibold hover:shadow-[0_0_20px_rgba(0,128,0,0.4)] transition-all">
              去逛逛
            </Link>
          </motion.div>
        ) : (
          <div className="flex gap-6 flex-col lg:flex-row">
            {/* Items */}
            <div className="flex-1 space-y-4">
              {items.map((item, i) => (
                <motion.div key={item.id}
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-black/50 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex gap-4 items-center">
                  <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center text-3xl shrink-0">
                    {CATEGORY_EMOJI[item.product.category] || "🛍️"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/store/${item.product.id}`}
                      className="text-white font-medium text-sm hover:text-[#00ff00] transition-colors line-clamp-2">
                      {item.product.name}
                    </Link>
                    <p className="text-[#ff6700] font-bold mt-1">¥{Number(item.product.price).toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => updateQty(item.product.id, item.quantity - 1)}
                      className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-8 text-center font-semibold text-sm">{item.quantity}</span>
                    <button onClick={() => updateQty(item.product.id, item.quantity + 1)}
                      disabled={item.quantity >= item.product.stock}
                      className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all disabled:opacity-30">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="text-white font-semibold text-sm w-20 text-right shrink-0">
                    ¥{(Number(item.product.price) * item.quantity).toFixed(2)}
                  </div>
                  <button onClick={() => removeItem(item.product.id)}
                    className="text-white/30 hover:text-red-400 transition-colors shrink-0 ml-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </div>

            {/* Summary */}
            <div className="lg:w-[280px] shrink-0">
              <div className="bg-black/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sticky top-24">
                <h3 className="text-white font-bold text-lg mb-4">订单摘要</h3>
                <div className="space-y-2 mb-4 pb-4 border-b border-white/10">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-white/50 truncate flex-1 mr-2">{item.product.name.slice(0, 10)}...</span>
                      <span className="text-white/70 shrink-0">×{item.quantity}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center mb-6">
                  <span className="text-white/60">合计</span>
                  <span className="text-[#ff6700] font-bold text-2xl">¥{total.toFixed(2)}</span>
                </div>
                <button onClick={() => router.push("/order/confirm")}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#008000] to-[#00b300] text-white font-bold hover:shadow-[0_0_20px_rgba(0,128,0,0.5)] transition-all">
                  去结算
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
