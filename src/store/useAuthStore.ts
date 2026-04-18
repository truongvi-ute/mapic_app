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
  login: (userData: User, token: string) => void;
  logout: () => void;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: false,
  user: null,
  token: null,
  login: (userData, token) => set({ isLoggedIn: true, user: userData, token }),
  logout: () => set({ isLoggedIn: false, user: null, token: null }),
  setUser: (user) => set({ user, isLoggedIn: !!user }),
  setToken: (token) => set({ token }),
}));
