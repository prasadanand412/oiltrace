import { useEffect, useState } from "react";
import { AuthContext } from "./auth-context";
import {
  apiRequest,
  clearAccessToken,
  getAccessToken,
  storeAccessToken,
} from "../services/api";

const SESSION_KEY = "oiltrace.auth.session";
const PROFILES_KEY = "oiltrace.auth.profiles";

const defaultProfile = {
  name: "User Name",
  email: "user@oiltrace.local",
  phone: "+91 ",
  organisation: "Indian Coast Guard",
  designation: "Incident Commander",
  role: "Incident Commander",
  photoUrl: "",
};

function readJson(storage, key, fallback) {
  try {
    const value = storage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function getProfiles() {
  return readJson(window.localStorage, PROFILES_KEY, {});
}

function saveProfiles(profiles) {
  window.localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

function getStoredSession() {
  const localSession = readJson(window.localStorage, SESSION_KEY, null);
  return localSession ?? readJson(window.sessionStorage, SESSION_KEY, null);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredSession());
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    async function restoreServerSession() {
      if (!getAccessToken()) {
        setUser(null);
        setAuthLoading(false);
        return;
      }
      try {
        const account = await apiRequest("/me");
        const savedProfile = getStoredSession() || {};
        const profile = { ...defaultProfile, ...savedProfile, email: account.username };
        persistSession(profile, Boolean(window.localStorage.getItem("access_token")));
        setUser(profile);
      } catch {
        clearAccessToken();
        window.localStorage.removeItem(SESSION_KEY);
        window.sessionStorage.removeItem(SESSION_KEY);
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    }
    void restoreServerSession();
  }, []);

  function persistSession(profile, remember = true) {
    const storage = remember ? window.localStorage : window.sessionStorage;
    const otherStorage = remember ? window.sessionStorage : window.localStorage;
    otherStorage.removeItem(SESSION_KEY);
    storage.setItem(SESSION_KEY, JSON.stringify(profile));
  }

  async function signIn({ email, password, remember = true }) {
    const body = new URLSearchParams({ username: email.trim(), password });
    const token = await apiRequest("/auth/login", {
      authenticated: false,
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    storeAccessToken(token.access_token, remember);
    const account = await apiRequest("/me");
    const profiles = getProfiles();
    const profile = {
      ...defaultProfile,
      ...(profiles[account.username.toLowerCase()] || {}),
      email: account.username,
      name: profiles[account.username.toLowerCase()]?.name || account.username,
    };
    persistSession(profile, remember);
    setUser(profile);
    return profile;
  }

  async function signUp({ name, email, organisation, password, remember = true }) {
    await apiRequest("/auth/register", {
      authenticated: false,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: email.trim(), password }),
    });
    const profile = {
      ...defaultProfile,
      name: name.trim(),
      email: email.trim(),
      organisation: organisation.trim(),
    };
    const profiles = getProfiles();
    profiles[profile.email.toLowerCase()] = profile;
    saveProfiles(profiles);
    return signIn({ email: profile.email, password, remember });
  }

  function signOut() {
    const token = getAccessToken();
    if (token) void apiRequest("/auth/logout", { method: "POST" }).catch(() => undefined);
    clearAccessToken();
    window.localStorage.removeItem(SESSION_KEY);
    window.sessionStorage.removeItem(SESSION_KEY);
    setUser(null);
  }

  async function updateProfile(updates) {
    if (!user) return;

    const updatedUser = {
      ...user,
      ...updates,
      role: updates.designation || user.role,
    };
    const profiles = getProfiles();
    delete profiles[user.email.toLowerCase()];
    profiles[updatedUser.email.toLowerCase()] = updatedUser;
    saveProfiles(profiles);

    persistSession(updatedUser, Boolean(window.localStorage.getItem(SESSION_KEY)));
    setUser(updatedUser);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        authLoading,
        isAuthenticated: Boolean(user),
        signIn,
        signUp,
        signOut,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
