"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { clearAuthSession, getStoredUser, setAuthSession } from "@/lib/auth-session";

export type AuthUser = {
  id?: string;
  _id?: string;
  name?: string;
  username?: string;
  employeeId?: string;
  role?: string;
  roles?: string[];
  roleId?: string;
  email?: string;
};

type AuthStatus = "unknown" | "authenticated" | "unauthenticated";

type AuthState = {
  user: AuthUser | null;
  status: AuthStatus;
  setUser: (user: AuthUser | null) => void;
  setStatus: (status: AuthStatus) => void;
  clear: () => void;
  hasAnyRole: (roles: string[]) => boolean;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      status: "unknown",
      setUser: (user) => {
        set({ user });
        setAuthSession(user);
      },
      setStatus: (status) => set({ status }),
      clear: () => {
        set({ user: null, status: "unauthenticated" });
        clearAuthSession();
      },
      hasAnyRole: (roles) => {
        const user = get().user;
        if (!user) return false;

        const allowed = roles.map((r) => String(r).trim().toLowerCase());

        // Check single `role` string first
        if (user.role && String(user.role).trim().length > 0) {
          const current = String(user.role).trim().toLowerCase();
          if (allowed.includes(current)) return true;
        }

        // Support `roles` array on the user payload
        const userRoles = user.roles;
        if (Array.isArray(userRoles) && userRoles.length > 0) {
          for (const r of userRoles) {
            if (!r) continue;
            if (allowed.includes(String(r).trim().toLowerCase())) return true;
          }
        }

        return false;
      },
    }),
    {
      name: "auth-store-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const fallbackUser = getStoredUser<AuthUser>();
        if (!state.user && fallbackUser) {
          state.user = fallbackUser;
        }
      },
    },
  ),
);

