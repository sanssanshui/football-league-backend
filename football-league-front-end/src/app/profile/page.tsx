"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/lib/store";
import { apiFetch } from "@/lib/api";
import { motion, useMotionValue, useTransform, Variants } from "framer-motion";
import { UserCog, Trash2, Eye } from "lucide-react";

const API_URL = "http://localhost:5002";
const STORAGE_KEY = "followedTeams";

interface BackendTeam { id: number; name: string; city: string; logo_url: string; }
interface GuessRecord {
  id: number;
  match: { home_team: { name: string }; away_team: { name: string }; home_score: number; away_score: number; match_time: string; };
  guess_result: string; score_cost: number; score_reward: number | null; isCorrect: boolean | null;
}
interface OrderItem {
  id: number; product_id: number; quantity: number; unit_price: string;
  product_snapshot: string;
}
interface Order {
  id: number; out_trade_no: string; total_amount: string; status: string;
  createdAt: string; orderItems: OrderItem[];
}
interface UserProfile {
  id: number; username: string; score: number; avatar_url: string | null;
  gender?: string; birthday?: string; birthplace?: string; bio?: string;
  focusTeams: BackendTeam[];
}

const guessResultText: Record<string, string> = { home_win: "主队胜", away_win: "客队胜", draw: "平局" };

const styleColors: Record<string, string> = {
  BALANCED: "#00ff88",
  SPEED: "#00ddff",
  POWER: "#ff6b35",
  TECHNICAL: "#7b61ff",
  STRIKER: "#ff4d6d",
  AMATEUR: "#ffd700",
};

const styleNames: Record<string, string> = {
  BALANCED: "全能均衡型",
  SPEED: "速度爆发型",
  POWER: "力量防守型",
  TECHNICAL: "技术组织型",
  STRIKER: "射门终结型",
  AMATEUR: "业余入门型",
};

function PlayerProfilesList({ token, router }: { token: string | null; router: any }) {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    loadProfiles();
  }, [token]);

  const loadProfiles = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/player-profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.code === 200) {
        setProfiles(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定要删除这个档案吗？")) return;
    try {
      const res = await fetch(`${API_URL}/api/player-profile/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.code === 200) {
        alert("删除成功");
        loadProfiles();
      } else {
        alert(json.message || "删除失败");
      }
    } catch (e) {
      console.error(e);
      alert("网络错误");
    }
  };

  const handleView = (profile: any) => {
    // 重新构造数据格式用于结果页面
    const data = {
      input: {
        height: profile.height,
        weight: profile.weight,
        age: profile.age,
        gender: profile.gender,
        blood_type: profile.blood_type,
        body_fat_rate: profile.body_fat_rate,
        preferred_foot: profile.preferred_foot,
        positions: JSON.parse(profile.positions || "[]"),
        resting_heart_rate: profile.resting_heart_rate,
        max_heart_rate: profile.max_heart_rate,
        lung_capacity: profile.lung_capacity,
        endurance_rating: profile.endurance_rating,
        weekly_exercise_count: profile.weekly_exercise_count,
        avg_exercise_duration: profile.avg_exercise_duration,
        football_years: profile.football_years,
        squat_max: profile.squat_max,
        bench_press_max: profile.bench_press_max,
        core_strength_rating: profile.core_strength_rating,
        explosive_rating: profile.explosive_rating,
        dribbling_rating: profile.dribbling_rating,
        passing_rating: profile.passing_rating,
        shooting_rating: profile.shooting_rating,
        defending_rating: profile.defending_rating,
        vision_rating: profile.vision_rating,
      },
      analysis: {
        abilities: {
          speed_value: profile.speed_value,
          power_value: profile.power_value,
          stamina_value: profile.stamina_value,
          dribbling_value: profile.dribbling_value,
          passing_value: profile.passing_value,
          shooting_value: profile.shooting_value,
          defending_value: profile.defending_value,
          vision_value: profile.vision_value,
        },
        player_style: profile.player_style,
        style_tags: JSON.parse(profile.style_tags || "[]"),
        overall_rating: profile.overall_rating,
        evaluation: profile.evaluation,
      },
    };
    sessionStorage.setItem("playerAnalysis", JSON.stringify(data));
    router.push("/player-profile/result");
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-white/50">加载中...</div>
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <div className="bg-white/5 border border-dashed border-white/20 p-12 text-center rounded-[24px]">
        <div className="text-6xl mb-4 opacity-80">🏃</div>
        <div className="text-xl font-medium text-white mb-2">还没有球员档案</div>
        <div className="text-white/50">创建你的第一个球员档案，生成专属数值分析！</div>
        <button
          onClick={() => router.push("/player-profile")}
          className="mt-6 px-6 py-2.5 bg-[#008000]/20 hover:bg-[#008000]/30 border border-[#008000]/30 text-[#00ff00] rounded-xl text-sm font-medium transition-all"
        >
          立即创建
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {profiles.map((profile) => {
        const color = styleColors[profile.player_style] || "#00aaff";
        const styleName = styleNames[profile.player_style] || profile.player_style;
        const tags = JSON.parse(profile.style_tags || "[]");
        const positions = JSON.parse(profile.positions || "[]");

        return (
          <motion.div
            key={profile.id}
            whileHover={{ scale: 1.005, backgroundColor: "rgba(255,255,255,0.07)" }}
            className="bg-white/5 border border-white/10 rounded-[20px] p-6 transition-all"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-2xl font-black" style={{ color }}>
                    {styleName}
                  </div>
                  <div
                    className="px-3 py-1 rounded-full text-sm font-bold"
                    style={{
                      background: `${color}33`,
                      color: color,
                      border: `1px solid ${color}`,
                    }}
                  >
                    总评 {profile.overall_rating}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {tags.slice(0, 3).map((tag: string, i: number) => (
                    <span
                      key={i}
                      className="text-xs px-2 py-1 rounded-lg"
                      style={{
                        background: `${color}22`,
                        color: "rgba(255,255,255,0.7)",
                        border: `1px solid ${color}44`,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-4 text-sm text-white/60">
                  <span>{profile.age}岁</span>
                  <span>{profile.height}cm</span>
                  <span>{profile.weight}kg</span>
                  <span>{positions.join("、")}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleView(profile)}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all"
                  title="查看详情"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(profile.id)}
                  className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 text-white/70 hover:text-red-400 transition-all"
                  title="删除档案"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="text-xs text-white/40">
              创建于 {new Date(profile.createdAt).toLocaleString("zh-CN", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}


const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};
const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100, damping: 15 } },
};

export default function ProfilePage() {
  const router = useRouter();
  const { token, username, logout } = useUserStore();

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [allTeams, setAllTeams] = useState<BackendTeam[]>([]);
  const [guesses, setGuesses] = useState<GuessRecord[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"focus" | "score" | "guesses" | "orders" | "profiles">("focus");
  const [orders, setOrders] = useState<Order[]>([]);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const bgX = useTransform(mouseX, [-1, 1], [-20, 20]);
  const bgY = useTransform(mouseY, [-1, 1], [-20, 20]);
  const cardX = useTransform(mouseX, [-1, 1], [15, -15]);
  const cardY = useTransform(mouseY, [-1, 1], [15, -15]);

  const handleMouseMove = (e: React.MouseEvent) => {
    mouseX.set((e.clientX / window.innerWidth - 0.5) * 2);
    mouseY.set((e.clientY / window.innerHeight - 0.5) * 2);
  };

  const getFollowedTeams = () => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
  };
  const saveFollowedTeams = (ids: string[]) => {
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  };

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (mounted && !token) router.replace("/auth"); }, [mounted, token, router]);

  useEffect(() => {
    if (!mounted || !token) return;
    const load = async () => {
      setLoading(true);
      try {
        const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
        const profileRes = await fetch(`${API_URL}/api/user/profile`, { headers });
        const profileData = await profileRes.json();
        if (profileData.code === 200) {
          setProfile(profileData.data);
          const ids = profileData.data.focusTeams.map((t: BackendTeam) => String(t.id));
          const finalIds = ids.length > 0 ? ids : getFollowedTeams();
          setSelectedTeamIds(finalIds);
          saveFollowedTeams(finalIds);
        } else if (profileData.code === 401) { logout(); router.replace("/auth"); }

        const teamsRes = await fetch(`${API_URL}/api/user/teams`, { headers });
        const teamsData = await teamsRes.json();
        if (teamsData.code === 200 && teamsData.data?.length > 0) setAllTeams(teamsData.data);

        const guessesRes = await fetch(`${API_URL}/api/user/guesses`, { headers });
        const guessesData = await guessesRes.json();
        if (guessesData.code === 200) setGuesses(guessesData.data);

        const ordersData = await apiFetch("/api/shop/orders");
        if (ordersData.code === 200) {
          setOrders(ordersData.data.filter((o: Order) => o.status === "PAID" || o.status === "COMPLETED" || o.status === "SHIPPED"));
        }
      } catch {
        setSelectedTeamIds(getFollowedTeams());
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [mounted, token, router, logout]);

  const handleToggleTeam = (teamId: string) => {
    const next = selectedTeamIds.includes(teamId)
      ? selectedTeamIds.filter(id => id !== teamId)
      : [...selectedTeamIds, teamId];
    setSelectedTeamIds(next);
    saveFollowedTeams(next);
  };

  const handleSaveFocusTeams = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/user/focus-teams`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ teamIds: selectedTeamIds.map(Number) }),
      });
      const data = await res.json();
      if (data.code === 200) {
        setProfile(prev => prev ? { ...prev, focusTeams: data.data.focusTeams } : null);
        saveFollowedTeams(selectedTeamIds);
        alert("关注球队保存成功");
      } else { alert(data.message || "保存失败"); }
    } catch { alert("网络请求失败，请检查后端服务"); }
  };

  // 用于关注球队选择器：使用后端数据
  const teamPickerList = allTeams.map(t => ({ id: String(t.id), name: t.name }));

  // 竞猜记录：使用后端数据
  const displayGuesses = guesses.length > 0 ? guesses : null;

  const totalScore = profile?.score ?? 0;
  const earnedScore = totalScore;
  const usedScore = 0;

  const handleClearGuesses = async () => {
    if (!token) return;
    if (!confirm("确定要清空所有竞猜记录并重置积分为0吗？")) return;
    try {
      const res = await fetch(`${API_URL}/api/user/guesses`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.code === 200) {
        setGuesses([]);
        setProfile(prev => prev ? { ...prev, score: 0 } : null);
      } else { alert(data.message || "清空失败"); }
    } catch { alert("网络请求失败"); }
  };

  if (!mounted) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-30 blur-sm"
          style={{ backgroundImage: "url('/images/pexels-markusspiske-114296.jpg')" }} />
        <div className="relative z-10 flex flex-col items-center gap-4 bg-black/40 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl">
          <div className="w-12 h-12 border-4 border-[#008000] border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(0,128,0,0.5)]" />
          <p className="text-white/80 font-medium tracking-wider">初始化空间中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex justify-center items-center font-sans overflow-hidden relative" onMouseMove={handleMouseMove}>
      {/* 视差背景 */}
      <motion.div
        className="absolute inset-[-50px] z-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/pexels-markusspiske-114296.jpg')", x: bgX, y: bgY }}
      />
      <div className="absolute inset-0 bg-black/50 z-0 pointer-events-none" />

      {/* 顶部导航 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="absolute top-8 left-8 right-8 z-20 flex justify-between items-center"
      >
<button
  onClick={() => router.push('/')}
  className="flex items-center gap-2 px-5 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 rounded-full text-white transition-all shadow-lg"
>
  <span>←</span> 返回
</button>
        <div className="w-10 h-10 bg-white/10 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-white cursor-pointer hover:bg-white/20 transition-all">
          🔔
        </div>
      </motion.div>

      {/* 主内容 */}
      <motion.div
        style={{ x: cardX, y: cardY }}
        variants={containerVariants} initial="hidden" animate="visible"
        className="relative z-10 w-[1200px] h-[750px] flex gap-8 p-4"
      >
        {/* 左侧边栏 */}
        <motion.div
          variants={itemVariants}
          className="w-[280px] bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[32px] flex flex-col items-center pt-10 pb-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)] shrink-0"
        >
          {/* Avatar */}
          <div className="relative mb-3">
            <div className="w-24 h-24 bg-gradient-to-tr from-[#008000] to-[#00ff00] rounded-full p-1 shadow-[0_0_20px_rgba(0,128,0,0.4)]">
              <div className="w-full h-full bg-[#1a1a1a] rounded-full overflow-hidden flex items-center justify-center text-3xl font-bold text-white">
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                  : (username || "球")[0]
                }
              </div>
            </div>
          </div>

          {/* Name + gender */}
          <div className="text-xl font-bold text-white tracking-wide">{username || "球迷用户"}</div>
          {profile?.gender && (
            <div className="text-xs text-white/40 mt-0.5">{profile.gender}</div>
          )}

          {/* Bio */}
          {profile?.bio && (
            <div className="text-xs text-white/50 text-center px-5 mt-1 leading-relaxed line-clamp-2">{profile.bio}</div>
          )}

          {/* Score */}
          <div className="flex items-center gap-1 mt-3 mb-6 bg-[#008000]/20 border border-[#008000]/40 px-4 py-1 rounded-full">
            <span className="text-yellow-400 text-sm">⭐</span>
            <span className="text-white/80 text-sm font-medium">{totalScore} 积分</span>
          </div>

          <div className="w-full px-6 flex flex-col gap-3">
            {([
              { id: "focus",   label: "关注球队", icon: "⚽" },
              { id: "score",   label: "个人积分", icon: "⭐" },
              { id: "guesses", label: "竞猜记录", icon: "📋" },
              { id: "orders",  label: "历史订单", icon: "🛍️" },
              { id: "profiles", label: "球员档案", icon: "🏃" },
            ] as const).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-3 text-lg py-3 px-6 rounded-2xl transition-all duration-300 overflow-hidden ${
                  activeTab === tab.id ? "text-white shadow-[0_4px_20px_rgba(0,128,0,0.3)]" : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                {activeTab === tab.id && (
                  <motion.div layoutId="activeTab" className="absolute inset-0 bg-[#008000]/80 border border-[#008000] rounded-2xl -z-10" />
                )}
                <span>{tab.icon}</span>
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}

            {/* 编辑信息按钮 */}
            <button
              onClick={() => router.push("/profile/edit")}
              className="flex items-center gap-3 text-base py-2.5 px-6 rounded-2xl text-white/50 hover:bg-white/5 hover:text-white transition-all duration-300 mt-1"
            >
              <UserCog className="w-4 h-4" />
              <span className="font-medium">编辑信息</span>
            </button>
          </div>
        </motion.div>

        {/* 右侧主面板 */}
        <motion.div
          variants={itemVariants}
          className="flex-1 bg-black/30 backdrop-blur-xl border border-white/10 rounded-[32px] p-10 overflow-y-auto shadow-[0_8px_32px_rgba(0,0,0,0.4)] custom-scrollbar"
        >
          {/* ---- 关注球队 ---- */}
          {activeTab === "focus" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
              <div className="text-3xl font-bold text-white mb-8 tracking-wide">关注球队</div>

              {selectedTeamIds.length === 0 ? (
                <div className="bg-white/5 border border-dashed border-white/20 p-12 text-center rounded-[24px]">
                  <div className="text-6xl mb-4 opacity-80">⚽</div>
                  <div className="text-xl font-medium text-white mb-2">暂无关注的球队</div>
                  <div className="text-white/50">在下方选择你心仪的苏超球队关注吧～</div>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                  {selectedTeamIds.map(teamId => {
                    const team = allTeams.find(t => String(t.id) === teamId);
                    if (!team) return null;
                    const TEAM_COLORS: Record<string, string> = {
                      '南京城市': '#0066b3', '苏州东吴': '#c91a1a', '无锡吴钩': '#f7b731',
                      '南通支云': '#a50044', '徐州骁龙': '#8a2be2', '常州龙城': '#ff8c00',
                      '连云港海港': '#20b2aa', '淮安楚州': '#d2691e', '盐城大丰': '#4682b4',
                      '扬州瘦西湖': '#9acd32', '镇江金山': '#5f9ea0', '泰州远大': '#ff4500', '宿迁项王': '#2e8b57',
                    };
                    const getColor = (n: string) => { for (const [k, v] of Object.entries(TEAM_COLORS)) if (n.includes(k)) return v; return '#008000'; };
                    const getShort = (n: string) => n.replace(/队$/, '').slice(0, 2);
                    const teamColor = getColor(team.name);
                    const teamShort = getShort(team.name);
                    return (
                      <motion.div
                        whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.1)" }}
                        key={teamId}
                        className="bg-white/5 border border-white/10 rounded-[20px] p-5 flex items-center gap-5 transition-all"
                      >
                        <div
                          className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white shrink-0 shadow-lg"
                          style={{ backgroundColor: teamColor, boxShadow: `0 0 15px ${teamColor}60` }}
                        >
                          {teamShort[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xl font-bold text-white mb-1">{team.name}</div>
                          <div className="text-xs text-white/60 mb-3 truncate">{team.city}</div>
                        </div>
                        <button
                          onClick={() => handleToggleTeam(teamId)}
                          className="w-8 h-8 rounded-full bg-white/5 hover:bg-red-500/80 border border-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all shrink-0 group"
                          title="取消关注"
                        >
                          <span className="group-hover:rotate-90 transition-transform">×</span>
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              <div className="mt-10 pt-8 border-t border-white/10">
                <p className="text-lg font-medium text-white mb-5">想要修改关注列表？</p>
                <div className="flex flex-wrap gap-3 mb-8">
                  {teamPickerList.map(t => {
                    const selected = selectedTeamIds.includes(t.id);
                    return (
                      <motion.button
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        key={t.id}
                        onClick={() => handleToggleTeam(t.id)}
                        className={`px-5 py-2 text-sm rounded-full backdrop-blur-md border transition-all duration-300 ${
                          selected
                            ? "bg-[#008000]/80 text-white border-[#008000] shadow-[0_0_15px_rgba(0,128,0,0.5)]"
                            : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        {selected ? "✓ " : ""}{t.name}
                      </motion.button>
                    );
                  })}
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={handleSaveFocusTeams}
                  className="bg-gradient-to-r from-[#008000] to-[#00b300] text-white px-8 py-3 rounded-xl font-medium shadow-[0_4px_20px_rgba(0,128,0,0.4)] hover:shadow-[0_4px_25px_rgba(0,128,0,0.6)] transition-all"
                >
                  保存关注设置
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ---- 个人积分 ---- */}
          {activeTab === "score" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
              <div className="text-3xl font-bold text-white mb-8 tracking-wide">个人积分</div>

              {/* 积分余额卡 */}
              <div className="w-full bg-gradient-to-br from-[#008000]/40 to-black/40 backdrop-blur-md border border-[#008000]/30 rounded-[24px] p-8 mb-6 shadow-lg">
                <div className="flex items-center gap-3 text-xl font-medium text-white mb-4">
                  <span className="text-2xl">⭐</span> 积分余额
                </div>
                <div className="flex items-end gap-4 mb-3">
                  <span className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70">
                    {totalScore}
                  </span>
                  <span className="text-white/60 mb-2">分</span>
                </div>
                <div className="flex gap-6 text-sm text-white/50">
                  <span>累计获得：<span className="text-white/80">{earnedScore}</span> 分</span>
                  <span>|</span>
                  <span>已使用：<span className="text-white/80">{usedScore}</span> 分</span>
                </div>
              </div>

              {/* 积分明细 */}
              <div className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-[24px] p-8">
                <div className="flex items-center gap-3 text-lg font-medium text-white mb-6">
                  📋 积分明细
                </div>
                {guesses.length === 0 ? (
                  <div className="text-center py-8 text-white/30 text-sm">暂无积分记录，去竞猜赢取积分吧！</div>
                ) : (
                  <div className="space-y-1">
                    {guesses.map(g => (
                      <div key={g.id} className="flex justify-between items-center py-3 border-b border-white/5 last:border-0">
                        <div>
                          <div className="text-white/80 text-sm">
                            竞猜 {g.match.home_team.name} vs {g.match.away_team.name}
                          </div>
                          <div className="text-xs text-white/40 mt-0.5">
                            {new Date(g.match.match_time).toLocaleDateString()}
                          </div>
                        </div>
                        <span className={`font-semibold text-base ${g.isCorrect === true ? "text-[#00ff00]" : "text-red-400"}`}>
                          {g.isCorrect === true ? `+${g.score_reward ?? 20}` : `-${g.score_cost}`} 分
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ---- 竞猜记录 ---- */}
          {activeTab === "guesses" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
              <div className="flex justify-between items-center mb-8">
                <div className="text-3xl font-bold text-white tracking-wide">竞猜记录</div>
                {displayGuesses !== null && (
                  <button onClick={handleClearGuesses}
                    className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm hover:bg-red-500/20 hover:border-red-500/40 transition-all">
                    清空记录
                  </button>
                )}
              </div>

              {displayGuesses !== null ? (
                <div className="space-y-5">
                  {displayGuesses.map(g => (
                    <motion.div
                      whileHover={{ scale: 1.01, backgroundColor: "rgba(255,255,255,0.08)" }}
                      key={g.id}
                      className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-[20px] p-6 transition-all"
                    >
                      <div className="flex justify-between items-center mb-3">
                        <div className="text-xl font-bold text-white">
                          {g.match.home_team.name} <span className="text-white/40 px-2">vs</span> {g.match.away_team.name}
                        </div>
                        <div className="text-sm text-white/50 bg-white/10 px-3 py-1 rounded-full">
                          {new Date(g.match.match_time).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-white/70 flex-wrap">
                        <div className="bg-black/30 px-4 py-2 rounded-lg border border-white/5">
                          我的竞猜: <span className="text-white font-medium ml-1">{g.guess_result}</span>
                        </div>
                        <div>消耗 <span className="text-yellow-400">{g.score_cost}</span> 积分</div>
                        <div className="text-white/20">|</div>
                        {g.isCorrect !== null ? (
                          <>
                            <div className="bg-black/30 px-4 py-2 rounded-lg border border-white/5">
                              比赛结果: <span className="text-white font-medium ml-1">
                                {g.match.home_score}-{g.match.away_score}
                              </span>
                            </div>
                            <div className={`px-4 py-2 rounded-lg font-semibold ${
                              g.isCorrect
                                ? 'bg-[#008000]/20 border border-[#008000]/40 text-[#00ff00]'
                                : 'bg-red-500/20 border border-red-500/40 text-red-400'
                            }`}>
                              {g.isCorrect ? `✓ 猜对了 +${g.score_reward ?? 20}分` : '✗ 猜错了'}
                            </div>
                          </>
                        ) : (
                          <div className="bg-orange-500/20 border border-orange-500/40 text-orange-400 px-4 py-2 rounded-lg">
                            ⏳ 等待比赛结果
                          </div>
                        )}
                        <div>赛果: <span className="text-white font-medium">{g.match.home_score} - {g.match.away_score}</span></div>
                        <div className="ml-auto">
                          {g.isCorrect === true && (
                            <span className="bg-[#008000]/20 text-[#00ff00] border border-[#008000]/50 px-4 py-1.5 rounded-full font-medium">
                              赢取 +{g.score_reward} 积分
                            </span>
                          )}
                          {g.isCorrect === false && (
                            <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-4 py-1.5 rounded-full">未中奖</span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="space-y-5">
                  {guesses.length === 0 ? (
                    <div className="text-center py-20 text-white/30">暂无竞猜记录</div>
                  ) : guesses.map(g => {
                    const matchDate = new Date(g.match.match_time);
                    const dateStr = `${matchDate.getFullYear()}-${String(matchDate.getMonth() + 1).padStart(2, '0')}-${String(matchDate.getDate()).padStart(2, '0')}`;
                    return (
                      <motion.div
                        whileHover={{ scale: 1.01, backgroundColor: "rgba(255,255,255,0.08)" }}
                        key={g.id}
                        className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-[20px] p-6 transition-all"
                      >
                        <div className="flex justify-between items-center mb-3">
                          <div className="text-xl font-bold text-white">
                            {g.match.home_team.name} <span className="text-white/40 px-2">vs</span> {g.match.away_team.name}
                          </div>
                          <div className="text-sm text-white/50 bg-white/10 px-3 py-1 rounded-full">
                            {dateStr}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-white/70 flex-wrap">
                          <div className="bg-black/30 px-4 py-2 rounded-lg border border-white/5">
                            我的竞猜: <span className="text-white font-medium ml-1">{guessResultText[g.guess_result] ?? g.guess_result}</span>
                          </div>
                          <div>消耗 <span className="text-yellow-400">{g.score_cost}</span> 积分</div>
                          <div className="text-white/20">|</div>
                          <div>赛果: <span className="text-white font-medium">{g.match.home_score} - {g.match.away_score}</span></div>
                          <div className="ml-auto">
                            {g.isCorrect === true && (
                              <span className="bg-[#008000]/20 text-[#00ff00] border border-[#008000]/50 px-4 py-1.5 rounded-full font-medium">
                                赢取 +{g.score_reward} 积分
                              </span>
                            )}
                            {g.isCorrect === false && (
                              <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-4 py-1.5 rounded-full">未中奖</span>
                            )}
                            {g.isCorrect === null && (
                              <span className="bg-white/10 text-white/40 border border-white/10 px-4 py-1.5 rounded-full">待开奖</span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
          {/* ---- 历史订单 ---- */}
          {activeTab === "orders" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
              <div className="text-3xl font-bold text-white mb-8 tracking-wide">历史订单</div>

              {orders.length === 0 ? (
                <div className="bg-white/5 border border-dashed border-white/20 p-12 text-center rounded-[24px]">
                  <div className="text-6xl mb-4 opacity-80">🛍️</div>
                  <div className="text-xl font-medium text-white mb-2">暂无已支付订单</div>
                  <div className="text-white/50">去商城购买周边商品吧～</div>
                  <button
                    onClick={() => router.push("/shop")}
                    className="mt-6 px-6 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400 rounded-xl text-sm font-medium transition-all"
                  >
                    前往商城
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map(order => {
                    const items: { name: string; image_url?: string }[] = order.orderItems.map(i => {
                      try { return JSON.parse(i.product_snapshot); } catch { return { name: "商品" }; }
                    });
                    const statusMap: Record<string, { label: string; color: string }> = {
                      PAID:      { label: "已支付", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
                      COMPLETED: { label: "已完成", color: "text-blue-400 bg-blue-500/10 border-blue-500/30" },
                      SHIPPED:   { label: "已发货", color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30" },
                    };
                    const st = statusMap[order.status] ?? { label: order.status, color: "text-white/50 bg-white/5 border-white/10" };
                    return (
                      <motion.div
                        key={order.id}
                        whileHover={{ scale: 1.005, backgroundColor: "rgba(255,255,255,0.07)" }}
                        className="bg-white/5 border border-white/10 rounded-[20px] p-6 transition-all cursor-pointer"
                        onClick={() => router.push(`/shop/orders/${order.id}`)}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="text-xs text-white/40 mb-1">订单号 {order.out_trade_no}</div>
                            <div className="text-sm text-white/60">
                              {new Date(order.createdAt).toLocaleString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </div>
                          <span className={`text-xs px-3 py-1 rounded-full border font-medium ${st.color}`}>{st.label}</span>
                        </div>
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                          {items.slice(0, 3).map((item, idx) => (
                            <span key={idx} className="text-sm text-white/70 bg-white/5 border border-white/10 px-3 py-1 rounded-lg">
                              {item.name}
                            </span>
                          ))}
                          {items.length > 3 && (
                            <span className="text-xs text-white/40">+{items.length - 3} 件</span>
                          )}
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-white/40">共 {order.orderItems.reduce((s, i) => s + i.quantity, 0)} 件商品</span>
                          <span className="text-emerald-400 font-semibold">¥{Number(order.total_amount).toFixed(2)}</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* ---- 球员档案 ---- */}
          {activeTab === "profiles" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
              <div className="flex justify-between items-center mb-8">
                <div className="text-3xl font-bold text-white tracking-wide">我的球员档案</div>
                <button
                  onClick={() => router.push("/player-profile")}
                  className="px-6 py-2.5 bg-[#008000]/20 hover:bg-[#008000]/30 border border-[#008000]/30 text-[#00ff00] rounded-xl text-sm font-medium transition-all"
                >
                  + 创建新档案
                </button>
              </div>

              <PlayerProfilesList token={token} router={router} />
            </motion.div>
          )}
        </motion.div>
      </motion.div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.4); }
      ` }} />
    </div>
  );
}
