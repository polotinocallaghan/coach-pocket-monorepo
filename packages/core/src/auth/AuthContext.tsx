"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { onAuthStateChanged, User, signOut as firebaseSignOut } from "firebase/auth";
import { auth } from "../firebase/firebase";
import { useRouter } from "next/navigation";
import { dataStore } from "../store";

interface AuthContextType {
    user: User | null;
    loading: boolean;
    firestoreReady: boolean;
    isGuest: boolean;
    setGuestMode: (val: boolean) => void;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    firestoreReady: false,
    isGuest: false,
    setGuestMode: () => {},
    signOut: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [firestoreReady, setFirestoreReady] = useState(false);
    const [isGuest, setIsGuest] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);
            setFirestoreReady(false);

            if (firebaseUser) {
                setIsGuest(false);
                // 1. Instantly load local cache so UI is responsive
                dataStore.initForUser(firebaseUser.uid);
                // 2. Pull fresh data from Firestore in background
                try {
                    await dataStore.syncFromFirestore(firebaseUser.uid);
                } catch (err) {
                    console.error("[AuthContext] Firestore sync failed:", err);
                }
                
                // Set cookie for middleware (removed Secure to allow localhost testing; Vercel handles HTTPS automatically)
                document.cookie = "tf_auth_status=authenticated; path=/; max-age=2592000; SameSite=Lax";
                setFirestoreReady(true);
            } else {
                // Guest / logged out — just use local state
                dataStore.initForUser(null);
                
                // Only clear the cookie if they are NOT a guest.
                if (document.cookie.indexOf('tf_auth_status=guest') === -1) {
                    setIsGuest(false);
                    document.cookie = "tf_auth_status=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
                } else {
                    setIsGuest(true);
                }
                setFirestoreReady(true);
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const signOut = async () => {
        try {
            await firebaseSignOut(auth);
            // Explicitly clear the cookie on sign out to exit guest mode as well
            document.cookie = "tf_auth_status=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
            router.push("/login");
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, firestoreReady, isGuest, setGuestMode: setIsGuest, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}
