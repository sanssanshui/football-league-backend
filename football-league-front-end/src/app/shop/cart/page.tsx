"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronLeft, Trash2, Plus, Minus, ShoppingBag } from "lucide-react";
import { useUserStore } from "@/lib/store";
import { apiFetch } from "@/lib/api";

interface CartItem {
  id: number;
  quantity: number;
  product: {
    id: number;
    name: string;
    price: string;
    stock: number;
    image_url: string | null;
    category: string;
    team: { name: string } | null;
  };
}

export default function CartPage() {
  const router = useRouter();
  const { token } = useUserStore();
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<CartItem[]>([]);
  const [total, setTotal] = useState("0.00");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);

  useEffect(() => { setMounted(true); }, []);

  const fetchCart = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const json = await apiFetch("/api/shop/cart");
      if (json.code === 200) {
        setItems(json.data.items);
        setTotal(json.data.total);
      }
    } catch {}
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => {
    if (mounted && !token) { router.push("/auth"); return; }
    if (mounted) fetchCart();
  }, [mounted, token, fetchCart, router]);

  const updateQty = async (itemId: number, qty: number) => {
    if (!token) return;
    setUpdating(itemId);
    try {
      const json = await apiFetch(`/api/shop/cart/${itemId}`, {
        method: "PUT",
        body: JSON.stringify({ quantity: qty }),
      });
      if (json.code === 200) await fetchCart();
    } catch {}
    finally { setUpdating(null); }
  };

  const removeItem = async (itemId: number) => {
    if (!token) return;
    setUpdating(itemId);
    try {
      await apiFetch(`/api/shop/cart/${itemId}`, { method: "DELETE" });
      await fetchCart();
    } catch {}
    finally { setUpdating(null); }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-[#0a0a0a] to-[#111] text-white">
      <header className="sticky top-0 z-50 w-full h-[68px] bg-black/30 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4 h-full flex items-center gap-4">
          <button onClick={() => router.push("/shop")} className="flex items-center gap-1 text-white/60 hover:text-white transition-colors">
            <ChevronLeft size={18} />
            <span className="text-sm">继续购物</span>
          </button>
          <span className="font-bold text-lg">购物车</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-white/10 rounded-xl animate-pulse" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 text-white/20">
            <ShoppingBag size={48} className="mx-auto mb-4 opacity-30" />
            <p className="mb-4">购物车是空的</p>
            <button onClick={() => router.push("/shop")} className="text-[#00ff00] hover:underline text-sm">去逛逛</button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              {items.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex gap-4 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-4"
                >
                  <img
                    src={item.product.image_url || `https://placehold.co/80x80/1e293b/64748b?text=No+Image`}
                    alt={item.product.name}
                    className="w-20 h-20 rounded-lg object-cover bg-black/60 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#00ff00]/70 mb-0.5">{item.product.category}</p>
                    <p className="text-sm font-medium text-white line-clamp-2 leading-snug">{item.product.name}</p>
                    <p className="text-[#00ff00] font-bold mt-1">¥{Number(item.product.price).toFixed(2)}</p>
                  </div>
                  <div className="flex flex-col items-end justify-between flex-shrink-0">
                    <button
                      onClick={() => removeItem(item.id)}
                      disabled={updating === item.id}
                      className="text-white/30 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                    <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-lg p-1">
                      <button
                        onClick={() => updateQty(item.id, item.quantity - 1)}
                        disabled={updating === item.id || item.quantity <= 1}
                        className="w-6 h-6 flex items-center justify-center text-white/60 hover:text-white disabled:opacity-30"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-6 text-center text-sm">{item.quantity}</span>
                      <button
                        onClick={() => updateQty(item.id, item.quantity + 1)}
                        disabled={updating === item.id || item.quantity >= item.product.stock}
                        className="w-6 h-6 flex items-center justify-center text-white/60 hover:text-white disabled:opacity-30"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="sticky bottom-4 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-white/50">共 {items.reduce((s, i) => s + i.quantity, 0)} 件</p>
                <p className="text-xl font-bold text-[#00ff00]">¥{total}</p>
              </div>
              <button
                onClick={() => router.push("/shop/checkout")}
                className="bg-gradient-to-r from-[#008000] to-[#00b300] text-white px-8 py-3 rounded-xl font-bold transition-all hover:shadow-[0_4px_20px_rgba(0,128,0,0.4)]"
              >
                去结算
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
