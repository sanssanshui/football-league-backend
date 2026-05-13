"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronLeft, MapPin, User, Phone, ShoppingBag } from "lucide-react";
import { useUserStore } from "@/lib/store";
import { apiFetch } from "@/lib/api";

interface CartItem {
  id: number;
  quantity: number;
  product: { id: number; name: string; price: string; image_url: string | null };
}

export default function CheckoutPage() {
  const router = useRouter();
  const { token } = useUserStore();
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<CartItem[]>([]);
  const [total, setTotal] = useState("0.00");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [receiver, setReceiver] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => { setMounted(true); }, []);

  const fetchCart = useCallback(async () => {
    if (!token) return;
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

  const handleSubmit = async () => {
    if (!receiver.trim()) { alert("请填写收货人姓名"); return; }
    if (!/^1[3-9]\d{9}$/.test(phone)) { alert("请填写正确的手机号"); return; }
    if (!address.trim()) { alert("请填写收货地址"); return; }
    if (items.length === 0) { alert("购物车为空"); return; }

    setSubmitting(true);
    try {
      const json = await apiFetch("/api/shop/orders", {
        method: "POST",
        body: JSON.stringify({ receiver, phone, address }),
      });
      if (json.code === 200) {
        router.push(`/shop/orders/${json.data.id}?new=1`);
      } else {
        alert(json.message || "下单失败");
      }
    } catch (e: any) {
      if (!e.message?.includes("未登录")) alert("网络错误");
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-[#0a0a0a] to-[#111] text-white">
      <header className="sticky top-0 z-50 w-full h-[68px] bg-black/30 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 h-full flex items-center gap-4">
          <button onClick={() => router.push("/shop/cart")} className="flex items-center gap-1 text-white/60 hover:text-white transition-colors">
            <ChevronLeft size={18} />
            <span className="text-sm">购物车</span>
          </button>
          <span className="font-bold text-lg">确认订单</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        {/* 收货信息 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-4"
        >
          <h2 className="font-semibold flex items-center gap-2">
            <MapPin size={16} className="text-[#00ff00]" /> 收货信息
          </h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <User size={14} className="text-white/40 flex-shrink-0" />
              <input
                type="text"
                placeholder="收货人姓名"
                value={receiver}
                onChange={(e) => setReceiver(e.target.value)}
                className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-[#008000]/50"
              />
            </div>
            <div className="flex items-center gap-3">
              <Phone size={14} className="text-white/40 flex-shrink-0" />
              <input
                type="tel"
                placeholder="手机号码"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-[#008000]/50"
              />
            </div>
            <div className="flex items-start gap-3">
              <MapPin size={14} className="text-white/40 flex-shrink-0 mt-2.5" />
              <textarea
                placeholder="详细收货地址（省市区街道门牌号）"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-[#008000]/50 resize-none"
              />
            </div>
          </div>
        </motion.div>

        {/* 商品清单 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5"
        >
          <h2 className="font-semibold flex items-center gap-2 mb-4">
            <ShoppingBag size={16} className="text-[#00ff00]" /> 商品清单
          </h2>
          {loading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => <div key={i} className="h-12 bg-white/10 rounded-lg animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <img
                    src={item.product.image_url || `https://placehold.co/48x48/1e293b/64748b?text=No+Image`}
                    alt={item.product.name}
                    className="w-12 h-12 rounded-lg object-cover bg-black/60 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white line-clamp-1">{item.product.name}</p>
                    <p className="text-xs text-white/40">x{item.quantity}</p>
                  </div>
                  <p className="text-sm text-[#00ff00] font-medium flex-shrink-0">
                    ¥{(Number(item.product.price) * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* 支付摘要 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5"
        >
          <div className="flex justify-between text-sm text-white/60 mb-2">
            <span>商品合计</span>
            <span>¥{total}</span>
          </div>
          <div className="flex justify-between text-sm text-white/60 mb-3">
            <span>运费</span>
            <span className="text-[#00ff00]">免运费</span>
          </div>
          <div className="flex justify-between font-bold text-lg border-t border-white/10 pt-3">
            <span>实付金额</span>
            <span className="text-[#00ff00]">¥{total}</span>
          </div>
        </motion.div>

        <button
          onClick={handleSubmit}
          disabled={submitting || items.length === 0}
          className="w-full bg-gradient-to-r from-[#008000] to-[#00b300] disabled:opacity-50 text-white py-4 rounded-2xl font-bold text-lg transition-all hover:shadow-[0_4px_20px_rgba(0,128,0,0.4)]"
        >
          {submitting ? "提交中..." : `提交订单 ¥${total}`}
        </button>

        <p className="text-center text-xs text-white/30">提交订单后将跳转至支付宝沙箱完成支付</p>
      </main>
    </div>
  );
}
