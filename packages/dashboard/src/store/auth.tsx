import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';

const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_USER_KEY = 'auth_user';

export type User = {
  userId: string;
  email: string;
  name: string;
  role: string;
};

type AuthContextValue = {
  token: string | null;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  children: ReactNode;
};

function getStoredToken(): string | null {
  try {
    const t = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!t) return null;
    const payload = JSON.parse(atob(t.split('.')[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
      return null;
    }
    return t;
  } catch {
    return null;
  }
}

function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [token, setToken] = useState<string | null>(getStoredToken);
  const [user, setUser] = useState<User | null>(getStoredUser);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error('Login failed');
    const data = await res.json();
    const jwt = data.token ?? data.access_token ?? data.accessToken;
    if (!jwt) throw new Error('No token in response');
    const u: User = data.user ?? { userId: data.userId ?? data.id, email, name: data.name ?? '', role: data.role ?? 'user' };
    localStorage.setItem(AUTH_TOKEN_KEY, jwt);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(u));
    setToken(jwt);
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const value: AuthContextValue = { token, user, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
