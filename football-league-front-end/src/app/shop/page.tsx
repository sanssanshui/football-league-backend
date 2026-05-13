"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ShoppingCart, Search, ChevronLeft, User, LogIn, Package } from "lucide-react";
import { useUserStore } from "@/lib/store";
import { apiFetch, API_URL } from "@/lib/api";

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

const CATEGORIES = ["全部", "球衣", "围巾", "帽子", "足球", "钥匙扣", "马克杯", "海报"];

export default function ShopPage() {
  const router = useRouter();
  const { token, username } = useUserStore();
  const [mounted, setMounted] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("全部");
  const [keyword, setKeyword] = useState("");
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => { setMounted(true); }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category !== "全部") params.set("category", category);
      if (keyword) params.set("keyword", keyword);
      const json = await apiFetch(`/api/shop/products?${params}`);
      if (json.code === 200) setProducts(json.data.items);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [category, keyword]);

  const fetchCartCount = useCallback(async () => {
    if (!token) return;
    try {
      const json = await apiFetch("/api/shop/cart");
      if (json.code === 200) setCartCount(json.data.items.length);
    } catch {}
  }, [token]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { if (mounted) fetchCartCount(); }, [mounted, fetchCartCount]);

  const addToCart = async (productId: number) => {
    if (!token) { router.push("/auth"); return; }
    try {
      const json = await apiFetch("/api/shop/cart", {
        method: "POST",
        body: JSON.stringify({ productId, quantity: 1 }),
      });
      if (json.code === 200) {
        setCartCount((c) => c + 1);
      } else {
        alert(json.message || "加入购物车失败");
      }
    } catch (e: any) {
      if (!e.message?.includes("未登录")) alert("网络错误");
    }
  };

  return (
    <div className="relative min-h-screen text-white">
      <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/images/pexels-eslames1-31160101.jpg')" }} />
      <div className="fixed inset-0 z-0 bg-black/70" />
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 w-full h-[68px] bg-black/30 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-sm text-white/60 hover:text-white transition-colors">首页</Link>
            <Link href="/matches" className="text-sm text-white/60 hover:text-white transition-colors">赛事</Link>
            <Link href="/teams" className="text-sm text-white/60 hover:text-white transition-colors">球员/球队</Link>
            <Link href="/community?tab=quiz" className="text-sm text-white/60 hover:text-white transition-colors">互动</Link>
            <Link href="/shop" className="text-sm text-white border-b-2 border-[#00ff00] pb-0.5">周边商城</Link>
            <Link href="/analysis/upload" className="text-sm text-white/60 hover:text-white transition-colors">视频分析</Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                placeholder="搜索..."
                className="bg-white/10 border border-white/20 rounded-lg pl-8 pr-3 py-1.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/40 w-36"
              />
            </div>
            {mounted && username ? (
              <Link href="/profile" className="text-sm text-white/70 flex items-center gap-1 hover:text-white transition-colors">
                <User size={14} /> 个人中心
              </Link>
            ) : (
              <Link href="/auth" className="text-sm text-white/60 hover:text-white transition-colors flex items-center gap-1">
                <LogIn size={14} /> 登录
              </Link>
            )}
            <button
              onClick={() => router.push("/shop/cart")}
              className="relative flex items-center gap-1.5 bg-gradient-to-r from-[#008000] to-[#00b300] text-white px-3 py-1.5 rounded-lg text-sm transition-colors hover:shadow-[0_4px_20px_rgba(0,128,0,0.4)]"
            >
              <ShoppingCart size={16} />
              购物车
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </button>
            {mounted && username && (
              <button onClick={() => router.push("/shop/orders")} className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white transition-colors">
                <Package size={14} /> 我的订单
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* 搜索栏 */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="搜索商品..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchProducts()}
              className="w-full bg-white/10 border border-white/20 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/40"
            />
          </div>
          <button
            onClick={fetchProducts}
            className="bg-gradient-to-r from-[#008000] to-[#00b300] text-white px-4 py-2 rounded-lg text-sm transition-colors hover:shadow-[0_4px_20px_rgba(0,128,0,0.4)]"
          >
            搜索
          </button>
        </div>

        {/* 分类筛选 */}
        <div className="flex gap-2 flex-wrap mb-8">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
                category === cat
                  ? "bg-[#008000]/80 text-white border border-[#008000]"
                  : "bg-white/5 border border-white/10 text-white/50 hover:text-white hover:border-white/30"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* 商品网格 */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white/5 rounded-xl h-72 animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 text-white/20">
            <Package size={48} className="mx-auto mb-4 opacity-30" />
            <p>暂无商品</p>
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ staggerChildren: 0.05 }}
          >
            {products.map((product, i) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden hover:border-[#008000]/50 transition-all group"
              >
                <Link href={`/shop/${product.id}`}>
                  <div className="aspect-square overflow-hidden bg-black/60">
                    <img
                      src={product.image_url || `https://placehold.co/400x400/1e293b/64748b?text=No+Image`}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-3">
                    <p className="text-xs text-[#00ff00]/70 mb-1">{product.category}{product.team ? ` · ${product.team.name}` : ""}</p>
                    <h3 className="text-sm font-medium text-white line-clamp-2 mb-2 leading-snug">{product.name}</h3>
                    <div className="flex items-center justify-between">
                      <span className="text-[#00ff00] font-bold">¥{Number(product.price).toFixed(2)}</span>
                      <span className="text-xs text-white/30">库存 {product.stock}</span>
                    </div>
                  </div>
                </Link>
                <div className="px-3 pb-3">
                  <button
                    onClick={() => addToCart(product.id)}
                    disabled={product.stock === 0}
                    className="w-full bg-gradient-to-r from-[#008000] to-[#00b300] text-white text-sm py-1.5 rounded-lg transition-colors hover:shadow-[0_4px_20px_rgba(0,128,0,0.4)] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {product.stock === 0 ? "已售罄" : "加入购物车"}
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>
    </div>
  );
}
