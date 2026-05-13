"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronLeft, ShoppingCart, Plus, Minus, Package } from "lucide-react";
import { useUserStore } from "@/lib/store";
import { apiFetch } from "@/lib/api";

interface Product {
  id: number;
  name: string;
  description: string | null;
  price: string;
  stock: number;
  image_url: string | null;
  category: string;
  team: { id: number; name: string } | null;
}

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { token } = useUserStore();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    const id = params?.productId;
    if (!id) return;
    apiFetch(`/api/shop/products/${id}`)
      .then((json) => { if (json.code === 200) setProduct(json.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params?.productId]);

  const addToCart = async () => {
    if (!token) { router.push("/auth"); return; }
    if (!product) return;
    setAdding(true);
    try {
      const json = await apiFetch("/api/shop/cart", {
        method: "POST",
        body: JSON.stringify({ productId: product.id, quantity }),
      });
      if (json.code === 200) {
        setAdded(true);
        setTimeout(() => setAdded(false), 2000);
      } else {
        alert(json.message || "加入购物车失败");
      }
    } catch (e: any) {
      if (!e.message?.includes("未登录")) alert("网络错误");
    } finally {
      setAdding(false);
    }
  };

  const buyNow = async () => {
    if (!token) { router.push("/auth"); return; }
    await addToCart();
    router.push("/shop/cart");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-[#0a0a0a] to-[#111] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#008000] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-[#0a0a0a] to-[#111] flex flex-col items-center justify-center text-white/20">
        <Package size={48} className="mb-4 opacity-30" />
        <p>商品不存在</p>
        <button onClick={() => router.push("/shop")} className="mt-4 text-[#00ff00] hover:underline text-sm">返回商城</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-[#0a0a0a] to-[#111] text-white">
      <header className="sticky top-0 z-50 w-full h-[68px] bg-black/30 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 h-full flex items-center gap-4">
          <button onClick={() => router.push("/shop")} className="flex items-center gap-1 text-white/60 hover:text-white transition-colors">
            <ChevronLeft size={18} />
            <span className="text-sm">商城</span>
          </button>
          <span className="text-white/20">|</span>
          <span className="text-sm text-white/60 truncate">{product.name}</span>
          <div className="ml-auto">
            <button
              onClick={() => router.push("/shop/cart")}
              className="flex items-center gap-1.5 bg-gradient-to-r from-[#008000] to-[#00b300] text-white px-3 py-1.5 rounded-lg text-sm transition-colors hover:shadow-[0_4px_20px_rgba(0,128,0,0.4)]"
            >
              <ShoppingCart size={16} /> 购物车
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="aspect-square rounded-2xl overflow-hidden bg-black/40 backdrop-blur-xl border border-white/10"
          >
            <img
              src={product.image_url || `https://placehold.co/600x600/1e293b/64748b?text=No+Image`}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col gap-4"
          >
            <div>
              <p className="text-[#00ff00]/70 text-sm mb-2">
                {product.category}{product.team ? ` · ${product.team.name}` : ""}
              </p>
              <h1 className="text-2xl font-bold text-white leading-tight">{product.name}</h1>
            </div>

            <div className="text-3xl font-bold text-[#00ff00]">
              ¥{Number(product.price).toFixed(2)}
            </div>

            {product.description && (
              <p className="text-white/50 text-sm leading-relaxed border-t border-white/10 pt-4">
                {product.description}
              </p>
            )}

            <div className="flex items-center gap-2 text-sm text-white/50 border-t border-white/10 pt-4">
              <span>库存：</span>
              <span className={product.stock > 0 ? "text-[#00ff00]" : "text-red-400"}>
                {product.stock > 0 ? `${product.stock} 件` : "已售罄"}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-white/60">数量：</span>
              <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-lg p-1">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-7 h-7 flex items-center justify-center text-white/60 hover:text-white transition-colors"
                >
                  <Minus size={14} />
                </button>
                <span className="w-8 text-center text-sm font-medium">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                  disabled={quantity >= product.stock}
                  className="w-7 h-7 flex items-center justify-center text-white/60 hover:text-white transition-colors disabled:opacity-30"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <div className="flex gap-3 mt-2">
              <button
                onClick={addToCart}
                disabled={adding || product.stock === 0}
                className="flex-1 bg-white/10 hover:bg-white/20 border border-white/20 text-white py-3 rounded-xl text-sm font-medium transition-colors disabled:opacity-40"
              >
                {added ? "已加入 ✓" : adding ? "加入中..." : "加入购物车"}
              </button>
              <button
                onClick={buyNow}
                disabled={product.stock === 0}
                className="flex-1 bg-gradient-to-r from-[#008000] to-[#00b300] text-white py-3 rounded-xl text-sm font-bold transition-colors hover:shadow-[0_4px_20px_rgba(0,128,0,0.4)] disabled:opacity-40"
              >
                立即购买
              </button>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
