import Link from "next/link";
import { Paperclip } from "lucide-react";

interface ChatMessageProps {
  message: {
    id: number;
    type: 'TEXT' | 'SYSTEM' | 'EVENT' | 'IMAGE' | 'FILE' | 'EMOJI';
    content: string;
    user: { id: number; username: string; avatar_url?: string | null };
    createdAt: string;
  };
  isOwn: boolean;
  currentUserId?: number;
}

export function ChatMessage({ message, isOwn }: ChatMessageProps) {
  const renderContent = () => {
    switch (message.type) {
      case 'IMAGE':
        return <img src={message.content} alt="图片" className="max-w-xs rounded-lg cursor-pointer" onClick={() => window.open(message.content, '_blank')} />;
      case 'FILE':
        return (
          <a href={message.content} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline hover:text-blue-300 flex items-center gap-1">
            <Paperclip className="w-3 h-3" />下载文件
          </a>
        );
      case 'EMOJI':
        return <span className="text-4xl">{message.content}</span>;
      case 'SYSTEM':
      case 'EVENT':
        return (
          <div className="text-center text-sm text-white/60 bg-white/5 px-4 py-2 rounded-full">
            {message.content}
          </div>
        );
      default:
        return <p className="text-white break-words">{message.content}</p>;
    }
  };

  if (message.type === 'SYSTEM' || message.type === 'EVENT') {
    return <div className="flex justify-center my-2">{renderContent()}</div>;
  }

  return (
    <div className={`flex gap-3 mb-4 ${isOwn ? 'flex-row-reverse' : ''}`}>
      <Link href={`/profile?userId=${message.user.id}`} className="shrink-0">
        <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white overflow-hidden hover:ring-2 hover:ring-emerald-400 transition cursor-pointer">
          {message.user.avatar_url ? (
            <img src={message.user.avatar_url} alt={message.user.username} className="w-full h-full object-cover" />
          ) : (
            <span className="font-bold">{message.user.username[0]?.toUpperCase()}</span>
          )}
        </div>
      </Link>
      <div className={`flex flex-col max-w-[70%] ${isOwn ? 'items-end' : ''}`}>
        <span className="text-xs text-white/40 mb-1">{message.user.username}</span>
        <div className={`px-4 py-2 rounded-2xl ${isOwn ? 'bg-emerald-600 text-white' : 'bg-white/10 text-white'}`}>
          {renderContent()}
        </div>
        <span className="text-xs text-white/30 mt-1">
          {new Date(message.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}
