import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';

interface Profile {
  id: string;
  role: 'admin' | 'user';
  full_name: string;
  badge_number: string | null;
}

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  profile: null,
  isAdmin: false,
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ 
    profile,
    isAdmin: profile?.role === 'admin'
  }),
  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, profile: null, isAdmin: false });
  },
}));
