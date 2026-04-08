import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAI, GoogleAIBackend, getGenerativeModel } from "firebase/ai";

const firebaseConfig = {
    apiKey: "AIzaSyB-SXy-Elp_olukKgEsNwyAtNp2AlQWJ7M",
    authDomain: "coach-pocket-2.firebaseapp.com",
    projectId: "coach-pocket-2",
    storageBucket: "coach-pocket-2.firebasestorage.app",
    messagingSenderId: "629290087936",
    appId: "1:629290087936:web:af014d773fadac70648ae5",
    measurementId: "G-NLC4EJHVCX"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

// Initialize Firestore with modern persistent cache (works across tabs automatically)
const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
    })
});

// Initialize Vertex AI
const ai = getAI(app, { backend: new GoogleAIBackend() });

// Initialize Firebase Storage
const storage = getStorage(app);

export { app, auth, db, ai, getGenerativeModel, storage };

