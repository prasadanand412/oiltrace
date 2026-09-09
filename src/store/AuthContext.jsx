import { useEffect, useState } from "react";
import { AuthContext } from "./auth-context";
import { firebaseAuth, getFirebaseProfile, saveFirebaseProfile, signInWithGooglePopup, signOutFirebase } from "../services/firebase";
import { onAuthStateChanged } from "firebase/auth";

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
  const [authLoading, setAuthLoading] = useState(Boolean(firebaseAuth));

  useEffect(() => {
    if (!firebaseAuth) {
      return undefined;
    }
    return onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const profile = await getFirebaseProfile(firebaseUser);
          persistSession(profile, true);
          setUser(profile);
        } else {
          setUser(null);
        }
      } finally {
        setAuthLoading(false);
      }
    });
  }, []);

  function persistSession(profile, remember = true) {
    const storage = remember ? window.localStorage : window.sessionStorage;
    const otherStorage = remember ? window.sessionStorage : window.localStorage;
    otherStorage.removeItem(SESSION_KEY);
    storage.setItem(SESSION_KEY, JSON.stringify(profile));
  }

  function signIn({ email, remember = true }) {
    const normalizedEmail = email.trim().toLowerCase();
    const profiles = getProfiles();
    const profile = profiles[normalizedEmail];
    if (!profile) return false;

    const session = { ...profile };
    persistSession(session, remember);
    setUser(session);
    return true;
  }

  async function signInWithGoogle() {
    const profile = await signInWithGooglePopup();
    const profiles = getProfiles();
    profiles[profile.email.toLowerCase()] = profile;
    saveProfiles(profiles);
    persistSession(profile, true);
    setUser(profile);
    return profile;
  }

  function signUp({ name, email, organisation, remember = true }) {
    const profile = {
      ...defaultProfile,
      name: name.trim(),
      email: email.trim(),
      organisation: organisation.trim(),
    };
    const profiles = getProfiles();
    profiles[profile.email.toLowerCase()] = profile;
    saveProfiles(profiles);

    const storage = remember ? window.localStorage : window.sessionStorage;
    const otherStorage = remember ? window.sessionStorage : window.localStorage;
    otherStorage.removeItem(SESSION_KEY);
    storage.setItem(SESSION_KEY, JSON.stringify(profile));
    setUser(profile);
  }

  function signOut() {
    window.localStorage.removeItem(SESSION_KEY);
    window.sessionStorage.removeItem(SESSION_KEY);
    void signOutFirebase();
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
    if (updatedUser.provider === "google.com") await saveFirebaseProfile(updatedUser);
    setUser(updatedUser);
  }

  return <AuthContext.Provider value={{ user, authLoading, isAuthenticated: Boolean(user), signIn, signInWithGoogle, signUp, signOut, updateProfile }}>{children}</AuthContext.Provider>;
}
