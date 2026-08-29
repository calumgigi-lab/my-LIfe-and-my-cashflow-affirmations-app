import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from "react";
import { apiRequest, setAuthUserId, queryClient } from "@/lib/query-client";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface AuthUser {
  id: number;
  username: string;
  email: string;
  displayName: string | null;
  isAdmin?: boolean;
  profilePictureUrl?: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (patch: Partial<AuthUser>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const res = await apiRequest("GET", "/api/auth/me");
      const data = await res.json();
      setUser(data);
      setAuthUserId(data?.id ?? null);
      if (data?.id) await AsyncStorage.setItem("auth_user", JSON.stringify(data));
    } catch {
      // fallback to cached user for header auth
      try {
        const cached = await AsyncStorage.getItem("auth_user");
        if (cached) {
          const u = JSON.parse(cached);
          if (u?.id) {
            setAuthUserId(u.id);
            setUser(u);
          }
        }
      } catch {}
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const res = await apiRequest("POST", "/api/auth/login", { email, password }, { skipAuthHeader: true });
    const data = await res.json();
    setUser(data);
    setAuthUserId(data?.id ?? null);
    if (data?.id) await AsyncStorage.setItem("auth_user", JSON.stringify(data));
  }

  async function register(username: string, email: string, password: string, displayName?: string) {
    const res = await apiRequest("POST", "/api/auth/register", {
      username,
      email,
      password,
      displayName,
    }, { skipAuthHeader: true });
    const data = await res.json();
    setUser(data);
    setAuthUserId(data?.id ?? null);
    if (data?.id) await AsyncStorage.setItem("auth_user", JSON.stringify(data));
  }

  const logout = useCallback(async () => {
    try {
      await apiRequest("POST", "/api/auth/logout", undefined, { skipAuthHeader: true });
    } catch {
      // ignore logout network errors
    }
    setUser(null);
    setAuthUserId(null);
    await AsyncStorage.removeItem("auth_user");
    queryClient.clear();
  }, []);

  const updateUser = useCallback(async (patch: Partial<AuthUser>) => {
    setUser((prev) => {
      const next = prev ? { ...prev, ...patch } : prev;
      if (next) AsyncStorage.setItem("auth_user", JSON.stringify(next));
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, login, register, logout, updateUser }),
    [user, isLoading, logout, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
