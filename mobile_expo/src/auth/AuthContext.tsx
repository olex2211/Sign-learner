import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { getAccessToken, clearTokens } from "../auth/tokenStore";
import { login as apiLogin, register as apiRegister } from "../api/auth";
import { getMe, getUserStats } from "../api/users";
import { getPracticeProgress } from "../api/practice";
import { getLessons } from "../api/lessons";
import type {
  User,
  UserStats,
  PracticeProgress,
  Lesson,
  LoginRequest,
  RegisterRequest,
} from "../api/types";

interface AuthState {
  user: User | null;
  stats: UserStats | null;
  lessons: Lesson[];
  progress: PracticeProgress[];
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  refreshData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchBootstrapData() {
  const [user, stats, lessons, progress] = await Promise.all([
    getMe(),
    getUserStats(),
    getLessons(),
    getPracticeProgress(),
  ]);
  return { user, stats, lessons, progress };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    stats: null,
    lessons: [],
    progress: [],
    isAuthenticated: false,
    isBootstrapping: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const token = await getAccessToken();
        if (!token) {
          if (!cancelled) {
            setState((s) => ({ ...s, isBootstrapping: false }));
          }
          return;
        }

        const { user, stats, lessons, progress } = await fetchBootstrapData();
        if (!cancelled) {
          setState({
            user,
            stats,
            lessons,
            progress,
            isAuthenticated: true,
            isBootstrapping: false,
            error: null,
          });
        }
      } catch {
        await clearTokens();
        if (!cancelled) {
          setState((s) => ({
            ...s,
            isBootstrapping: false,
            isAuthenticated: false,
          }));
        }
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (data: LoginRequest) => {
    await apiLogin(data);
    const { user, stats, lessons, progress } = await fetchBootstrapData();
    setState({
      user,
      stats,
      lessons,
      progress,
      isAuthenticated: true,
      isBootstrapping: false,
      error: null,
    });
  }, []);

  const register = useCallback(async (data: RegisterRequest) => {
    await apiRegister(data);
    const { user, stats, lessons, progress } = await fetchBootstrapData();
    setState({
      user,
      stats,
      lessons,
      progress,
      isAuthenticated: true,
      isBootstrapping: false,
      error: null,
    });
  }, []);

  const logout = useCallback(async () => {
    await clearTokens();
    setState({
      user: null,
      stats: null,
      lessons: [],
      progress: [],
      isAuthenticated: false,
      isBootstrapping: false,
      error: null,
    });
  }, []);

  const refreshData = useCallback(async () => {
    try {
      const { user, stats, lessons, progress } = await fetchBootstrapData();
      setState((s) => ({
        ...s,
        user,
        stats,
        lessons,
        progress,
        error: null,
      }));
    } catch {
      // Interceptor in client.ts handles 401
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ ...state, login, register, logout, refreshData }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
