import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { doc, getDoc, getFirestore, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseConfigured = Object.values(firebaseConfig).every(Boolean);
const app = firebaseConfigured ? (getApps().length ? getApp() : initializeApp(firebaseConfig)) : null;
export const firebaseAuth = app ? getAuth(app) : null;
export const firestore = app ? getFirestore(app) : null;

export function requireFirebase() {
  if (!firebaseConfigured || !firebaseAuth || !firestore) {
    throw new Error("Google sign-in is not configured. Add the Firebase VITE_ settings to .env.local.");
  }
}

export async function signInWithGooglePopup() {
  requireFirebase();
  const result = await signInWithPopup(firebaseAuth, new GoogleAuthProvider());
  return getFirebaseProfile(result.user);
}

export async function getFirebaseProfile(firebaseUser) {
  requireFirebase();
  const userRef = doc(firestore, "users", firebaseUser.uid);
  const existing = await getDoc(userRef);
  const previous = existing.exists() ? existing.data() : {};
  const profile = {
    uid: firebaseUser.uid,
    name: previous.name || firebaseUser.displayName || "Google User",
    email: firebaseUser.email || previous.email || "",
    phone: previous.phone || "",
    organisation: previous.organisation || "OilTrace Operations",
    designation: previous.designation || previous.role || "Incident Commander",
    role: previous.role || "Incident Commander",
    photoUrl: firebaseUser.photoURL || previous.photoUrl || "",
    provider: "google.com",
  };
  await setDoc(userRef, { ...profile, updatedAt: new Date().toISOString() }, { merge: true });
  return profile;
}

export async function saveFirebaseProfile(profile) {
  requireFirebase();
  await setDoc(doc(firestore, "users", profile.uid), { ...profile, updatedAt: new Date().toISOString() }, { merge: true });
}

export async function signOutFirebase() {
  if (firebaseAuth) await signOut(firebaseAuth);
}
