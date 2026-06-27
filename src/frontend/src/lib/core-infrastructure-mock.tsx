import React, { createContext, useContext, useState, useEffect } from "react";
import { mockBackend } from "../mocks/backend";

// ── Session-per-tab identity ───────────────────────────────────────────────
// Every new browser tab automatically gets a unique random user ID stored in
// sessionStorage. sessionStorage is PER-TAB (not shared between tabs), so
// opening a new tab naturally creates a new user.
// localStorage IS shared between all tabs, so messages, friend requests, and
// call notifications travel between users in real time.
//
// Each user sets their display name via the Profile Setup modal that appears
// automatically on first launch — no URL params, no configuration needed.
function getOrCreateSessionUser(): string {
  // Optional developer override: ?mockUser=someId in the URL
  const urlParam = new URLSearchParams(window.location.search).get("mockUser");
  if (urlParam) {
    localStorage.setItem("socionet_session_user", urlParam);
    return urlParam;
  }
  const existing = localStorage.getItem("socionet_session_user");
  if (existing) return existing;
  // New tab → fresh unique ID
  const newId = `user-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  localStorage.setItem("socionet_session_user", newId);
  return newId;
}

export const SESSION_USER = getOrCreateSessionUser();

// ── Mock Principal ─────────────────────────────────────────────────────────
class MockPrincipal {
  private _text: string;
  constructor(text: string = "aaaaa-aa") {
    this._text = text;
  }
  toString() { return this._text; }
  toText() { return this._text; }
}

// ── Auth Context ───────────────────────────────────────────────────────────
interface AuthContextType {
  identity: { getPrincipal: () => MockPrincipal } | null;
  loginStatus: "idle" | "logging-in" | "success" | "loginError";
  loginError: Error | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  clear: () => Promise<void>;
  isInitializing: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function InternetIdentityProvider({ children }: { children: React.ReactNode }) {
  const [identity, setIdentity] = useState<{ getPrincipal: () => MockPrincipal } | null>(null);
  const [loginStatus, setLoginStatus] = useState<AuthContextType["loginStatus"]>("idle");
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Auto-login with this tab's unique session user ID
    const mockUser = SESSION_USER;
    localStorage.setItem("mock_identity_principal", mockUser);
    setIdentity({ getPrincipal: () => new MockPrincipal(mockUser) });
    setLoginStatus("success");
    setIsInitializing(false);
  }, []);

  const login = async () => {
    setLoginStatus("logging-in");
    await new Promise((resolve) => setTimeout(resolve, 600));
    const mockUser = SESSION_USER;
    localStorage.setItem("mock_identity_principal", mockUser);
    setIdentity({ getPrincipal: () => new MockPrincipal(mockUser) });
    setLoginStatus("success");
  };

  const logout = async () => {
    localStorage.removeItem("mock_identity_principal");
    setIdentity(null);
    setLoginStatus("idle");
  };

  const clear = logout;

  return (
    <AuthContext.Provider
      value={{ identity, loginStatus, loginError: null, login, logout, clear, isInitializing }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useInternetIdentity() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useInternetIdentity must be used within an InternetIdentityProvider");
  }
  return context;
}

export function useActor(createActorFn?: any) {
  return {
    actor: mockBackend as any,
    isFetching: false,
  };
}
