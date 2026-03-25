// src/lib/store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// 定义用户状态类型
interface UserState {
  user_id: number | null
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
      user_id: null,
      token: null,
      username: '',
      avatar_url: null,

      // 登录：保存用户信息到store
      login: (userData) => set({
        user_id: userData.user_id,
        token: userData.access_token,
        username: userData.username,
        avatar_url: userData.avatar_url || null,
      }),

      // 退出登录：清空所有用户信息
      logout: () => set({
        user_id: null,
        token: null,
        username: '',
        avatar_url: null,
      }),
    }),
    {
      // 持久化配置：存在localStorage里，key为football-user-state
      name: 'football-user-state',
      // 只持久化需要的字段，避免冗余
      partialize: (state) => ({
        user_id: state.user_id,
        token: state.token,
        username: state.username,
        avatar_url: state.avatar_url,
      }),
    }
  )
)