import { create } from "zustand";

interface UserState {
  user_id: string;
  username: string;
  token: string;
  avatar_url: string | null;
  login: (data: {
    user_id: string;
    access_token: string;
    username: string;
    avatar_url?: string | null;
  }) => void;
  setUsername: (name: string) => void;
  logout: () => void;
}

// Load initial state from localStorage
function loadInitialState() {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem("user");
    if (stored) return JSON.parse(stored);
  } catch {}
  return {};
}

export const useUserStore = create<UserState>((set) => {
  const initial = loadInitialState();
  return {
    user_id: initial.user_id || "",
    username: initial.username || "",
    token: initial.token || "",
    avatar_url: initial.avatar_url || null,

    login: (data) => {
      const state = {
        user_id: data.user_id,
        username: data.username,
        token: data.access_token,
        avatar_url: data.avatar_url || null,
      };
      localStorage.setItem("user", JSON.stringify(state));
      localStorage.setItem("token", data.access_token);
      set(state);
    },

    setUsername: (name: string) => {
      set((s) => {
        const updated = { ...s, username: name };
        localStorage.setItem("user", JSON.stringify({ user_id: s.user_id, username: name, token: s.token, avatar_url: s.avatar_url }));
        return { username: name };
      });
    },

    logout: () => {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      set({ user_id: "", username: "", token: "", avatar_url: null });
    },
  };
});
