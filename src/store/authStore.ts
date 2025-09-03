import { create } from 'zustand';
import { supabase } from '../utils/supabaseClient';
import { User } from '@supabase/supabase-js';

interface AuthStore {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  setUser: (user: User | null) => void;
  signOut: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  
  setUser: (user) => {
    set({ 
      user, 
      isAuthenticated: !!user,
      isLoading: false 
    });
  },
  
  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      set({ 
        user: null, 
        isAuthenticated: false 
      });
      
      // Clear local storage
      localStorage.removeItem('database-schema');
      
      // Reload to reset app state
      window.location.reload();
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  },
  
  checkAuth: async () => {
    try {
      set({ isLoading: true });
      
      const { data: { user } } = await supabase.auth.getUser();
      
      set({ 
        user, 
        isAuthenticated: !!user,
        isLoading: false 
      });
    } catch (error) {
      console.error('Auth check error:', error);
      set({ 
        user: null, 
        isAuthenticated: false,
        isLoading: false 
      });
    }
  }
}));

// Set up auth state listener
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth state changed:', event, session?.user?.email);
  useAuthStore.getState().setUser(session?.user || null);
});
