// src/lib/store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// 定义用户状态类型
interface UserState {
  userId: number | null       // ✅ 和后端完全对齐：userId
  token: string | null
  username: string
  avatar_url: string | null
  
  // 登录方法
  login: (userData: {
    user_id: number
    access_token: string
    username: string
    avatar_url?: string | null
  }) => void
  
  // 退出登录方法
  logout: () => void
}

// 创建带持久化的store，兼容Next.js客户端组件
export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      userId: null,            // ✅ 和后端完全对齐
      token: null,
      username: '',
      avatar_url: null,

      // 登录：保存用户信息到store
      login: (userData) => set({
        userId: userData.user_id,  // ✅ 关键修复！和后端JwtAuthGuard完全一致
        token: userData.access_token,
        username: userData.username,
        avatar_url: userData.avatar_url || null,
      }),

      // 退出登录：清空所有用户信息
      logout: () => set({
        userId: null,
        token: null,
        username: '',
        avatar_url: null,
      }),
    }),
    {
      name: 'football-user-state',
      partialize: (state) => ({
        userId: state.userId,       // ✅ 同步修改持久化字段
        token: state.token,
        username: state.username,
        avatar_url: state.avatar_url,
      }),
    }
  )
)