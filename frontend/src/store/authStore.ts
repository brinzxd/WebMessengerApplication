import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  userId: number | null;
  nickname: string | null;
  setAuth: (token: string, userId: number, nickname: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      userId: null,
      nickname: null,
      setAuth: (token, userId, nickname) => set({ token, userId, nickname }),
      logout: () => set({ token: null, userId: null, nickname: null }),
    }),
    { name: 'auth' }
  )
);
