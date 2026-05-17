import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  userId: number | null;
  nickname: string | null;
  hasHydrated: boolean;
  setAuth: (token: string, userId: number, nickname: string) => void;
  logout: () => void;
  setHasHydrated: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      userId: null,
      nickname: null,
      hasHydrated: false,
      setAuth: (token, userId, nickname) => set({ token, userId, nickname }),
      logout: () => set({ token: null, userId: null, nickname: null }),
      setHasHydrated: (v) => set({ hasHydrated: v }),
    }),
    {
      name: 'auth',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
