"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, User, LogIn, Send, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";

// --- 1. 类型定义 ---
type MVPMatch = {
  date: string;
  time: string;
  round: string;
  homeTeam: string;
  awayTeam: string;
  homePlayers: string[];
  awayPlayers: string[];
};

type ChatMessage = {
  id: number;
  author: string;
  text: string;
  isOwn: boolean;
};

// --- 2. 常量数据 ---
const mvpMatches: MVPMatch[] = [
  {
    date: '05月13日', time: '19:30', round: '第5轮',
    homeTeam: '国际米兰', awayTeam: 'AC米兰',
    homePlayers: ['劳塔罗', '巴雷拉', '恰尔汗奥卢', '邓弗里斯'],
    awayPlayers: ['莱奥', '吉鲁', '特奥', '迈尼昂']
  },
  {
    date: '05月20日', time: '21:00', round: '第6轮',
    homeTeam: '皇家马德里', awayTeam: '巴塞罗那',
    homePlayers: ['本泽马', '莫德里奇', '维尼修斯', '库尔图瓦'],
    awayPlayers: ['莱万', '佩德里', '加维', '特尔施特根']
  },
  {
    date: '05月27日', time: '18:30', round: '第7轮',
    homeTeam: '拜仁慕尼黑', awayTeam: '多特蒙德',
    homePlayers: ['凯恩', '穆勒', '基米希', '诺伊尔'],
    awayPlayers: ['罗伊斯', '布兰特', '科贝尔', '施洛特贝克']
  }
];

const initialMessages: ChatMessage[] = [
  { id: 1, author: 'A', text: '这球太帅了！', isOwn: false },
  { id: 2, author: '我', text: '我觉得MVP应该是劳塔罗', isOwn: true },
  { id: 3, author: 'B', text: '有没有一起看球的？我在现场！', isOwn: false },
  { id: 4, author: 'C', text: '期待下一场德比', isOwn: false },
  { id: 5, author: '我', text: '国际米兰加油！', isOwn: true },
  { id: 6, author: 'D', text: '有没有人预测比分？', isOwn: false },
];

const avatarColors = ['#b5651d', '#2a6f97', '#4a7c59', '#9c89b8'];

export default function CommunityPage() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'mvp' | 'chat' | 'quiz'>('mvp');

  // MVP 投票状态
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [selectedPlayer, setSelectedPlayer] = useState<{ name: string; side: 'home' | 'away' } | null>(null);

  // 聊天室状态
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [inputMessage, setInputMessage] = useState('');

  // 竞猜状态
  const [selectedPoints, setSelectedPoints] = useState('10积分');

  useEffect(() => {
    setMounted(true);
  }, []);

  // 交互逻辑
  const handlePrevMatch = () => {
    setCurrentMatchIndex((prev) => (prev - 1 + mvpMatches.length) % mvpMatches.length);
    setSelectedPlayer(null);
  };
  const handleNextMatch = () => {
    setCurrentMatchIndex((prev) => (prev + 1) % mvpMatches.length);
    setSelectedPlayer(null);
  };

  const handleVote = () => {
    if (!selectedPlayer) {
      alert('请选择一名球员');
      return;
    }
    alert(`您已为 ${selectedPlayer.name} 投票！`);
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;
    const newMsg: ChatMessage = {
      id: Date.now(),
      author: '我',
      text: inputMessage,
      isOwn: true
    };
    setMessages((prev) => [...prev, newMsg]);
    setInputMessage('');
  };

  const handleSubmitQuiz = () => {
    alert('竞猜已提交！祝您好运。');
  };

  if (!mounted) return null;

  const currentMatch = mvpMatches[currentMatchIndex];
  // 路由匹配：当前页面路径是 /community
  const isActive = pathname === '/community';

  return (
    <main className="relative min-h-screen bg-white transition-colors duration-300 overflow-x-hidden">
      
      {/* 导航栏：互动按钮指向正确的 /community 路径 */}
      <nav className="w-full h-[80px] bg-[#008000] sticky top-0 z-50 shadow-md">
        <div className="w-[1300px] h-full mx-auto flex items-center justify-between px-0">
          <div className="flex items-center gap-10 ml-5">
            <Link 
              href="/" 
              className="text-[20px] font-medium text-white hover:font-bold transition-all"
            >
              首页
            </Link>
            <Link 
              href="/matches" 
              className="text-[20px] font-medium text-white hover:font-bold transition-all"
            >
              赛事
            </Link>
            <Link 
              href="/teams" 
              className="text-[20px] font-medium text-white hover:font-bold transition-all"
            >
              球员/球队
            </Link>
            {/* 核心：href固定为 /community，和文件路径完全匹配 */}
            <Link 
              href="/community" 
              className={`${
                isActive 
                  ? 'text-[24px] font-bold text-white border-b-2 border-white pb-1' 
                  : 'text-[20px] font-medium text-white hover:font-bold transition-all'
              }`}
            >
              互动
            </Link>
          </div>

          <div className="flex items-center gap-10 mr-5">
            <div className="w-[400px] h-[40px] bg-white rounded-lg flex items-center overflow-hidden">
              <input 
                type="text" 
                placeholder="搜索比赛、球队、球员..."
                className="w-full h-full border-none outline-none px-5 text-[16px] text-[#333] placeholder:text-[#aaa] font-light"
              />
              <Search className="w-5 h-5 text-gray-400 mr-4" />
            </div>
            <Link 
              href="/auth" 
              className="text-[20px] font-medium text-white hover:font-bold transition-all whitespace-nowrap flex items-center gap-1"
            >
              <LogIn className="w-5 h-5" /> 登录
            </Link>
            <Link 
              href="/profile" 
              className="text-[20px] font-medium text-white hover:font-bold transition-all whitespace-nowrap flex items-center gap-1"
            >
              <User className="w-5 h-5" /> 个人中心
            </Link>
          </div>
        </div>
      </nav>

      {/* 主内容区 */}
      <div className="px-[120px] pb-[80px] pt-[60px] max-w-[1540px] mx-auto">
        <div className="flex gap-[50px] items-start">
          
          {/* 左侧选项卡 */}
          <div className="w-[250px] rounded overflow-hidden shrink-0">
            {(['mvp', 'chat', 'quiz'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`w-full h-[70px] flex items-center justify-center cursor-pointer transition-all border-b border-white/10 text-[18px] font-medium text-white ${
                  activeTab === tab
                    ? 'bg-[#006600] text-[20px] font-bold'
                    : 'bg-[#008000] hover:text-[20px] hover:font-bold'
                }`}
              >
                {tab === 'mvp' ? 'MVP投票' : tab === 'chat' ? '聊天室' : '赛事竞猜'}
              </button>
            ))}
          </div>

          {/* 右侧内容区 */}
          <div className="w-[1000px] min-h-[700px] bg-white border border-[#e0e0e0] p-[30px]">
            
            {/* MVP 投票模块 */}
            {activeTab === 'mvp' && (
              <div className="font-sans">
                <div className="flex items-center justify-center relative bg-[#f9f9f9] p-5 border border-[#e0e0e0] mb-[30px]">
                  <button 
                    onClick={handlePrevMatch}
                    className="absolute left-5 top-1/2 -translate-y-1/2 w-10 h-10 bg-white border border-[#ccc] rounded-full text-[28px] font-bold text-[#008000] hover:bg-[#008000] hover:text-white transition-colors flex items-center justify-center select-none"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  
                  <div className="text-center">
                    <div className="text-[#666] mb-2">{currentMatch.date} {currentMatch.time} · {currentMatch.round}</div>
                    <div className="flex items-center justify-center gap-8 text-2xl font-semibold">
                      <span>{currentMatch.homeTeam}</span>
                      <span className="w-[50px] h-[50px] rounded-full bg-[#008000] inline-block mx-2"></span>
                      <span className="text-[#888] font-normal">vs</span>
                      <span className="w-[50px] h-[50px] rounded-full bg-[#008000] inline-block mx-2"></span>
                      <span>{currentMatch.awayTeam}</span>
                    </div>
                  </div>

                  <button 
                    onClick={handleNextMatch}
                    className="absolute right-5 top-1/2 -translate-y-1/2 w-10 h-10 bg-white border border-[#ccc] rounded-full text-[28px] font-bold text-[#008000] hover:bg-[#008000] hover:text-white transition-colors flex items-center justify-center select-none"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </div>

                <div className="flex gap-10 mt-5">
                  {/* 主队 */}
                  <div className="flex-1 text-center">
                    <h3 className="text-xl font-semibold mb-5 text-[#008000] border-b-2 border-[#008000] pb-2">
                      {currentMatch.homeTeam}
                    </h3>
                    <div className="space-y-5">
                      {currentMatch.homePlayers.map((name, i) => (
                        <div
                          key={name}
                          onClick={() => setSelectedPlayer({ name, side: 'home' })}
                          className={`flex items-center gap-4 p-2.5 border-2 rounded-lg cursor-pointer transition-colors ${
                            selectedPlayer?.name === name && selectedPlayer?.side === 'home'
                              ? 'border-[#008000] bg-emerald-50'
                              : 'border-transparent hover:border-[#008000]'
                          }`}
                        >
                          <div 
                            className="w-[60px] h-[60px] rounded-full flex items-center justify-center text-white text-2xl font-bold border-3 border-transparent"
                            style={{ backgroundColor: avatarColors[i % 4] }}
                          >
                            {name.charAt(0)}
                          </div>
                          <span className="text-lg font-medium">{name}</span>
                          {selectedPlayer?.name === name && selectedPlayer?.side === 'home' && (
                            <CheckCircle2 className="w-5 h-5 text-[#008000] ml-auto" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 客队 */}
                  <div className="flex-1 text-center">
                    <h3 className="text-xl font-semibold mb-5 text-[#008000] border-b-2 border-[#008000] pb-2">
                      {currentMatch.awayTeam}
                    </h3>
                    <div className="space-y-5">
                      {currentMatch.awayPlayers.map((name, i) => (
                        <div
                          key={name}
                          onClick={() => setSelectedPlayer({ name, side: 'away' })}
                          className={`flex items-center gap-4 p-2.5 border-2 rounded-lg cursor-pointer transition-colors ${
                            selectedPlayer?.name === name && selectedPlayer?.side === 'away'
                              ? 'border-[#008000] bg-emerald-50'
                              : 'border-transparent hover:border-[#008000]'
                          }`}
                        >
                          <div 
                            className="w-[60px] h-[60px] rounded-full flex items-center justify-center text-white text-2xl font-bold border-3 border-transparent"
                            style={{ backgroundColor: avatarColors[(i + 2) % 4] }}
                          >
                            {name.charAt(0)}
                          </div>
                          <span className="text-lg font-medium">{name}</span>
                          {selectedPlayer?.name === name && selectedPlayer?.side === 'away' && (
                            <CheckCircle2 className="w-5 h-5 text-[#008000] ml-auto" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end mt-8">
                  <button
                    onClick={handleVote}
                    className="w-[120px] h-[45px] bg-[#008000] hover:bg-[#006600] text-white text-lg font-semibold rounded transition-colors"
                  >
                    投票
                  </button>
                </div>
              </div>
            )}

            {/* 聊天室模块 */}
            {activeTab === 'chat' && (
              <div className="h-[600px] flex flex-col border border-[#ddd] rounded-lg overflow-hidden">
                <div className="flex-1 p-5 overflow-y-auto bg-[#fafafa] flex flex-col gap-4">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex items-start gap-4 ${msg.isOwn ? 'flex-row-reverse' : ''}`}>
                      <div className="w-10 h-10 rounded-full bg-[#6c757d] flex items-center justify-center text-white font-bold shrink-0">
                        {msg.author.charAt(0)}
                      </div>
                      <div 
                        className={`max-w-[500px] p-2.5 px-4 rounded-lg text-[15px] leading-relaxed ${msg.isOwn ? 'bg-[#008000] text-white' : 'bg-[#e9ecef] text-[#333]'}`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex p-4 bg-white border-t border-[#ddd]">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="输入聊天内容..."
                    className="flex-1 h-[50px] px-4 py-2.5 border border-[#ccc] rounded-full text-base outline-none focus:border-[#008000]"
                  />
                  <button
                    onClick={handleSendMessage}
                    className="w-20 h-[50px] ml-2.5 bg-[#008000] hover:bg-[#006600] text-white border-none rounded-full text-base font-semibold cursor-pointer transition-colors flex items-center justify-center gap-1"
                  >
                    <Send className="w-4 h-4" />
                    发送
                  </button>
                </div>
              </div>
            )}

            {/* 赛事竞猜模块 */}
            {activeTab === 'quiz' && (
              <div className="font-sans">
                <table className="w-full border-collapse mt-5">
                  <thead>
                    <tr>
                      <th className="text-left p-4 bg-[#f0f0f0] font-semibold text-base border-b-2 border-[#ccc]">时间</th>
                      <th className="text-left p-4 bg-[#f0f0f0] font-semibold text-base border-b-2 border-[#ccc]">主队vs客队</th>
                      <th className="text-left p-4 bg-[#f0f0f0] font-semibold text-base border-b-2 border-[#ccc]">开售状态</th>
                      <th className="text-left p-4 bg-[#f0f0f0] font-semibold text-base border-b-2 border-[#ccc]">胜负</th>
                      <th className="text-left p-4 bg-[#f0f0f0] font-semibold text-base border-b-2 border-[#ccc]">比分</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[#e0e0e0]">
                      <td className="p-4 align-middle text-sm text-[#555] whitespace-nowrap">2026.11.16 19:30</td>
                      <td className="p-4 align-middle font-normal flex items-center gap-2 whitespace-nowrap">国际米兰 vs AC米兰</td>
                      <td className="p-4 align-middle"><span className="text-[#FF6700] font-semibold">已开售</span></td>
                      <td className="p-4 align-middle">
                        <div className="flex gap-3 items-center">
                          <label className="flex items-center gap-1.5 whitespace-nowrap cursor-pointer">
                            <input type="radio" name="bet1" className="w-4 h-4 accent-[#008000]" /> 主胜
                          </label>
                          <label className="flex items-center gap-1.5 whitespace-nowrap cursor-pointer">
                            <input type="radio" name="bet1" className="w-4 h-4 accent-[#008000]" /> 平
                          </label>
                          <label className="flex items-center gap-1.5 whitespace-nowrap cursor-pointer">
                            <input type="radio" name="bet1" className="w-4 h-4 accent-[#008000]" /> 客胜
                          </label>
                        </div>
                      </td>
                      <td className="p-4 align-middle">
                        <input type="text" placeholder="如2-1" className="w-[70px] p-1.5 border border-[#ccc] rounded text-center" />
                      </td>
                    </tr>
                    <tr className="border-b border-[#e0e0e0]">
                      <td className="p-4 align-middle text-sm text-[#555] whitespace-nowrap">2026.11.17 21:00</td>
                      <td className="p-4 align-middle font-normal flex items-center gap-2 whitespace-nowrap">皇家马德里 vs 巴塞罗那</td>
                      <td className="p-4 align-middle"><span className="text-[#FF6700] font-semibold">已开售</span></td>
                      <td className="p-4 align-middle">
                        <div className="flex gap-3 items-center">
                          <label className="flex items-center gap-1.5 whitespace-nowrap cursor-pointer">
                            <input type="radio" name="bet2" className="w-4 h-4 accent-[#008000]" /> 主胜
                          </label>
                          <label className="flex items-center gap-1.5 whitespace-nowrap cursor-pointer">
                            <input type="radio" name="bet2" className="w-4 h-4 accent-[#008000]" /> 平
                          </label>
                          <label className="flex items-center gap-1.5 whitespace-nowrap cursor-pointer">
                            <input type="radio" name="bet2" className="w-4 h-4 accent-[#008000]" /> 客胜
                          </label>
                        </div>
                      </td>
                      <td className="p-4 align-middle">
                        <input type="text" placeholder="如3-2" className="w-[70px] p-1.5 border border-[#ccc] rounded text-center" />
                      </td>
                    </tr>
                    <tr>
                      <td className="p-4 align-middle text-sm text-[#555] whitespace-nowrap">2026.11.18 18:00</td>
                      <td className="p-4 align-middle font-normal flex items-center gap-2 whitespace-nowrap">拜仁慕尼黑 vs 多特蒙德</td>
                      <td className="p-4 align-middle"><span className="text-black/50 font-medium">即将开售</span></td>
                      <td className="p-4 align-middle">
                        <div className="flex gap-3 items-center opacity-50">
                          <label className="flex items-center gap-1.5 whitespace-nowrap cursor-not-allowed">
                            <input type="radio" name="bet3" disabled className="w-4 h-4 accent-[#008000]" /> 主胜
                          </label>
                          <label className="flex items-center gap-1.5 whitespace-nowrap cursor-not-allowed">
                            <input type="radio" name="bet3" disabled className="w-4 h-4 accent-[#008000]" /> 平
                          </label>
                          <label className="flex items-center gap-1.5 whitespace-nowrap cursor-not-allowed">
                            <input type="radio" name="bet3" disabled className="w-4 h-4 accent-[#008000]" /> 客胜
                          </label>
                        </div>
                      </td>
                      <td className="p-4 align-middle">
                        <input type="text" placeholder="--" disabled className="w-[70px] p-1.5 border border-[#ccc] rounded text-center bg-gray-100 cursor-not-allowed" />
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div className="mt-8 p-5 bg-[#f9f9f9] border border-dashed border-[#008000] flex justify-between items-center">
                  <span className="text-lg font-semibold">选择消耗积分：</span>
                  <select 
                    value={selectedPoints}
                    onChange={(e) => setSelectedPoints(e.target.value)}
                    className="px-4 py-2 border border-[#008000] rounded text-base bg-white"
                  >
                    <option>10积分</option>
                    <option>20积分</option>
                    <option>50积分</option>
                    <option>100积分</option>
                  </select>
                  <button
                    onClick={handleSubmitQuiz}
                    className="w-[120px] h-[45px] bg-[#008000] hover:bg-[#006600] text-white border-none rounded text-base font-semibold cursor-pointer transition-colors"
                  >
                    确认竞猜
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      <div className="h-[20px]"></div>
    </main>
  );
}