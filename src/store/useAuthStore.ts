import { create } from 'zustand';

interface User {
  id: number;
  email: string;
  username: string;
  name?: string;
  avatarUrl?: string;
  bio?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  dateOfBirth?: string;
  phone?: string;
  coverImageUrl?: string;
}

interface AuthState {
  isLoggedIn: boolean;
  user: User | null;
  token: string | null;
  avatarVersion: number; // Increment when avatar changes to invalidate cache
  login: (userData: User, token: string) => void;
  logout: () => void;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  updateAvatar: (avatarUrl: string) => void; // Update avatar and increment version
}

export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: false,
  user: null,
  token: null,
  avatarVersion: 0,
  login: (userData, token) => set({ isLoggedIn: true, user: userData, token }),
  logout: () => set({ isLoggedIn: false, user: null, token: null, avatarVersion: 0 }),
  setUser: (user) => set({ user, isLoggedIn: !!user }),
  setToken: (token) => set({ token }),
  updateAvatar: (avatarUrl) => set((state) => ({
    user: state.user ? { ...state.user, avatarUrl } : null,
    avatarVersion: state.avatarVersion + 1, // Increment to invalidate cache
  })),
}));
