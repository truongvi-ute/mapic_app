import { create } from 'zustand';

export type MainScreenType = 
  | 'home' 
  | 'explore' 
  | 'explore-moment' 
  | 'create' 
  | 'friends' 
  | 'notifications' 
  | 'chat' 
  | 'chat-room' 
  | 'profile' 
  | 'albums' 
  | 'settings' 
  | 'edit-profile' 
  | 'main-map' 
  | 'moment-map' 
  | 'map' 
  | 'userProfile';

interface NavigationState {
  activeScreen: MainScreenType;
  screenParams: any;
  setActiveScreen: (screen: MainScreenType, params?: any) => void;
}

export const useMainNavigationStore = create<NavigationState>((set) => ({
  activeScreen: 'home',
  screenParams: null,
  setActiveScreen: (screen, params = null) => set({ activeScreen: screen, screenParams: params }),
}));
