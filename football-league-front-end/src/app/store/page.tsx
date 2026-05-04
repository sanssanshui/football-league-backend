"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, ShoppingCart, Search } from "lucide-react";
import { useUserStore } from "@/lib/store";

const API = "http://localhost:5002";

interface Product {
  id: number;
  name: string;
  description: string;
  price: string;
  stock: number;
  image_url: string | null;
  category: string;
  is_active: boolean;
}

const CATEGORIES = ["全部", "球衣", "围巾", "帽子", "配件", "纪念品"];

const CATEGORY_EMOJI: Record<string, string> = {
  全部: "🛍️", 球衣: "👕", 围巾: "🧣", 帽子: "🧢", 配件: "📿", 纪念品: "🏆",
};

const PLACEHOLDER_COLORS: Record<string, string> = {
  球衣: "#0066b3", 围巾: "#c91a1a", 帽子: "#f7b731", 配件: "#8a2be2", 纪念品: "#008000",
};

export default function StorePage() {
  const router = useRouter();
  const { token } = useUserStore();
  const [mounted, setMounted] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState("全部");
  const [cartCount, setCartCount] = useState(0);
  const [addingId, setAddingId] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    setMounted(true);
    loadProducts();
    if (token) loadCartCount();
  }, [token]);

  useEffect(() => {
    loadProducts(category);
  }, [category]);

  const loadProducts = async (cat?: string) => {
    try {
      const url = cat && cat !== "全部" ? `${API}/api/store/products?category=${encodeURIComponent(cat)}` : `${API}/api/store/products`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.code === 200) setProducts(json.data);
    } catch {}
  };

  const loadCartCount = async () => {
    try {
      const res = await fetch(`${API}/api/cart`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.code === 200) setCartCount(json.data.length);
    } catch {}
  };

  const handleAddToCart = async (productId: number) => {
    if (!token) { router.push("/auth"); return; }
    setAddingId(productId);
    try {
      const res = await fetch(`${API}/api/cart`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ productId, quantity: 1 }),
      });
      const json = await res.json();
      if (json.code === 200) {
        setMsg({ text: "已加入购物车", ok: true });
        setCartCount((c) => c + 1);
      } else {
        setMsg({ text: json.message || "添加失败", ok: false });
      }
    } catch {
      setMsg({ text: "网络错误", ok: false });
    } finally {
      setAddingId(null);
      setTimeout(() => setMsg(null), 2500);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-black text-white font-sans relative overflow-x-hidden">
      <div className="fixed inset-0 z-0 bg-cover bg-center opacity-30"
        style={{ backgroundImage: "url('/images/pexels-eslames1-31160101.jpg')" }} />
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-black/80 via-black/60 to-black/90" />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-white/10 bg-black/30 backdrop-blur-xl sticky top-0">
        <button onClick={() => router.back()}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm transition-all">
          <ArrowLeft className="w-4 h-4" /> 返回
        </button>
        <h1 className="text-xl font-bold">苏超周边商城</h1>
        <Link href="/cart" className="relative flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm transition-all">
          <ShoppingCart className="w-4 h-4" />
          购物车
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#ff4500] rounded-full text-xs flex items-center justify-center font-bold">
              {cartCount}
            </span>
          )}
        </Link>
      </div>

      {/* Toast */}
      {msg && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl text-sm font-medium border ${
            msg.ok ? "bg-[#008000]/20 border-[#008000]/40 text-[#00ff00]" : "bg-red-500/10 border-red-500/20 text-red-400"
          }`}>
          {msg.text}
        </motion.div>
      )}

      <div className="relative z-10 max-w-[1200px] mx-auto px-6 py-8">
        {/* Category tabs */}
        <div className="flex gap-3 mb-8 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => setCategory(cat)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all border ${
                category === cat
                  ? "bg-[#008000]/80 border-[#008000] text-white shadow-[0_0_15px_rgba(0,128,0,0.4)]"
                  : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
              }`}>
              {CATEGORY_EMOJI[cat]} {cat}
            </button>
          ))}
        </div>

        {/* Product grid */}
        {products.length === 0 ? (
          <div className="text-center py-20 text-white/30">暂无商品</div>
        ) : (
          <div className="grid grid-cols-3 gap-6">
            {products.map((p, i) => (
              <motion.div key={p.id}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-black/50 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden hover:border-[#008000]/40 transition-all group">
                {/* Product image */}
                <Link href={`/store/${p.id}`}>
                  <div className="h-48 flex items-center justify-center relative overflow-hidden"
                    style={{ backgroundColor: (PLACEHOLDER_COLORS[p.category] || "#333") + "22" }}>
                    <div className="text-6xl select-none">{CATEGORY_EMOJI[p.category] || "🛍️"}</div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    <span className="absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-medium bg-black/50 border border-white/20 text-white/70">
                      {p.category}
                    </span>
                    {p.stock <= 10 && p.stock > 0 && (
                      <span className="absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium bg-orange-500/80 text-white">
                        仅剩{p.stock}件
                      </span>
                    )}
                    {p.stock === 0 && (
                      <span className="absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium bg-red-500/80 text-white">
                        已售罄
                      </span>
                    )}
                  </div>
                </Link>

                <div className="p-4">
                  <Link href={`/store/${p.id}`}>
                    <h3 className="text-white font-semibold text-sm mb-1 line-clamp-2 hover:text-[#00ff00] transition-colors">
                      {p.name}
                    </h3>
                  </Link>
                  <p className="text-white/40 text-xs mb-3 line-clamp-2">{p.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[#ff6700] font-bold text-lg">¥{Number(p.price).toFixed(2)}</span>
                    <button
                      onClick={() => handleAddToCart(p.id)}
                      disabled={addingId === p.id || p.stock === 0}
                      className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-[#008000] to-[#00b300] text-white text-xs font-semibold hover:shadow-[0_0_12px_rgba(0,128,0,0.5)] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                      {addingId === p.id ? "添加中..." : p.stock === 0 ? "已售罄" : "加入购物车"}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
