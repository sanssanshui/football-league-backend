"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle, ShoppingBag, List } from "lucide-react";

function PaySuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const outTradeNo = searchParams.get("out_trade_no") || "";
  const tradeNo = searchParams.get("trade_no") || "";
  const totalAmount = searchParams.get("total_amount") || "";

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-black text-white font-sans relative flex items-center justify-center">
      <div className="fixed inset-0 z-0 bg-cover bg-center opacity-20"
        style={{ backgroundImage: "url('/images/pexels-eslames1-31160101.jpg')" }} />
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-black/90 via-black/70 to-black/95" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 max-w-[500px] w-full mx-4 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-3xl p-10 text-center">

        {/* Success icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="w-24 h-24 rounded-full bg-[#008000]/20 border-2 border-[#008000]/60 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-12 h-12 text-[#00ff00]" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-2xl font-bold text-white mb-2">
          支付成功！
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-white/50 text-sm mb-8">
          感谢您购买苏超周边，您的订单已确认
        </motion.p>

        {/* Order info */}
        {(outTradeNo || totalAmount) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-8 text-left space-y-3">
            {totalAmount && (
              <div className="flex justify-between">
                <span className="text-white/50 text-sm">支付金额</span>
                <span className="text-[#ff6700] font-bold">¥{totalAmount}</span>
              </div>
            )}
            {outTradeNo && (
              <div className="flex justify-between">
                <span className="text-white/50 text-sm">订单编号</span>
                <span className="text-white/70 text-xs font-mono">{outTradeNo}</span>
              </div>
            )}
            {tradeNo && (
              <div className="flex justify-between">
                <span className="text-white/50 text-sm">支付宝流水号</span>
                <span className="text-white/70 text-xs font-mono">{tradeNo}</span>
              </div>
            )}
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex gap-3">
          <Link href="/order/list"
            className="flex-1 py-3 rounded-xl bg-white/10 border border-white/20 text-white font-semibold hover:bg-white/20 transition-all flex items-center justify-center gap-2 text-sm">
            <List className="w-4 h-4" /> 查看订单
          </Link>
          <Link href="/store"
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#008000] to-[#00b300] text-white font-bold hover:shadow-[0_0_20px_rgba(0,128,0,0.4)] transition-all flex items-center justify-center gap-2 text-sm">
            <ShoppingBag className="w-4 h-4" /> 继续购物
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default function PaySuccessPage() {
  return (
    <Suspense>
      <PaySuccessContent />
    </Suspense>
  );
}
