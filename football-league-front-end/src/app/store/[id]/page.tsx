"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, ShoppingCart, Plus, Minus } from "lucide-react";
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
  team?: { id: number; name: string } | null;
}

const CATEGORY_EMOJI: Record<string, string> = {
  球衣: "👕", 围巾: "🧣", 帽子: "🧢", 配件: "📿", 纪念品: "🏆",
};

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useUserStore();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    const id = params.id;
    if (!id) return;
    fetch(`${API}/api/store/products/${id}`)
      .then((r) => r.json())
      .then((json) => { if (json.code === 200) setProduct(json.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params.id]);

  const handleAddToCart = async (buyNow = false) => {
    if (!token) { router.push("/auth"); return; }
    setAdding(true);
    try {
      const res = await fetch(`${API}/api/cart`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ productId: product!.id, quantity }),
      });
      const json = await res.json();
      if (json.code === 200) {
        if (buyNow) { router.push("/cart"); return; }
        setMsg({ text: `已加入购物车 ×${quantity}`, ok: true });
      } else {
        setMsg({ text: json.message || "添加失败", ok: false });
      }
    } catch {
      setMsg({ text: "网络错误", ok: false });
    } finally {
      setAdding(false);
      setTimeout(() => setMsg(null), 2500);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-[#008000] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!product) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white gap-4">
      <p className="text-white/50">商品不存在</p>
      <Link href="/store" className="text-[#00ff00] hover:underline">返回商城</Link>
    </div>
  );

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
        <h1 className="text-xl font-bold">商品详情</h1>
        <Link href="/cart" className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm transition-all">
          <ShoppingCart className="w-4 h-4" /> 购物车
        </Link>
      </div>

      {msg && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl text-sm font-medium border ${
            msg.ok ? "bg-[#008000]/20 border-[#008000]/40 text-[#00ff00]" : "bg-red-500/10 border-red-500/20 text-red-400"
          }`}>
          {msg.text}
        </motion.div>
      )}

      <div className="relative z-10 max-w-[900px] mx-auto px-6 py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-black/50 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden">
          <div className="flex gap-0 flex-col md:flex-row">
            {/* Image */}
            <div className="md:w-[400px] h-[360px] flex items-center justify-center bg-white/5 border-b md:border-b-0 md:border-r border-white/10">
              <div className="text-[120px] select-none">{CATEGORY_EMOJI[product.category] || "🛍️"}</div>
            </div>

            {/* Info */}
            <div className="flex-1 p-8 flex flex-col gap-5">
              <div>
                <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-[#008000]/20 border border-[#008000]/40 text-[#00ff00] mb-3">
                  {product.category}
                </span>
                <h2 className="text-2xl font-bold text-white leading-tight">{product.name}</h2>
                {product.team && (
                  <p className="text-white/40 text-sm mt-1">关联球队：{product.team.name}</p>
                )}
              </div>

              <p className="text-white/60 text-sm leading-relaxed">{product.description}</p>

              <div className="flex items-center gap-3">
                <span className="text-[#ff6700] font-bold text-3xl">¥{Number(product.price).toFixed(2)}</span>
                <span className={`text-sm ${product.stock > 10 ? "text-white/40" : product.stock > 0 ? "text-orange-400" : "text-red-400"}`}>
                  {product.stock > 10 ? `库存充足` : product.stock > 0 ? `仅剩 ${product.stock} 件` : "已售罄"}
                </span>
              </div>

              {/* Quantity */}
              <div className="flex items-center gap-4">
                <span className="text-white/60 text-sm">数量</span>
                <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                  <button onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-8 text-center font-semibold">{quantity}</span>
                  <button onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                    disabled={quantity >= product.stock}
                    className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all disabled:opacity-30">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 mt-auto">
                <button onClick={() => handleAddToCart(false)}
                  disabled={adding || product.stock === 0}
                  className="flex-1 py-3 rounded-xl bg-white/10 border border-white/20 text-white font-semibold hover:bg-white/20 transition-all disabled:opacity-50">
                  加入购物车
                </button>
                <button onClick={() => handleAddToCart(true)}
                  disabled={adding || product.stock === 0}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#008000] to-[#00b300] text-white font-bold hover:shadow-[0_0_20px_rgba(0,128,0,0.5)] transition-all disabled:opacity-50">
                  {product.stock === 0 ? "已售罄" : "立即购买"}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
