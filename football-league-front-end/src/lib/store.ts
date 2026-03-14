
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserData {
    user_id: number | null;
    username: string | null;
    token: string | null;
    avatar_url: string | null;
}

interface UserStore extends UserData {
    login: (userData: UserData) => void;
    logout: () => void;
}

export const useUserStore = create<UserStore>()(
    persist(
        (set) => ({
            user_id: null,
            username: null,
            token: null,
            avatar_url: null,
            login: (data: UserData) =>
                set({
                    user_id: data.user_id,
                    username: data.username,
                    token: data.token,
                    avatar_url: data.avatar_url,
                }),
            logout: () =>
                set({
                    user_id: null,
                    username: null,
                    token: null,
                    avatar_url: null,
                }),
        }),
        {
            name: 'football-user-storage',
        }
    )
);
