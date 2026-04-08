import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

// Paste your Firebase Config keys here (matches your .env or firebase.ts)
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "coach-pocket.firebaseapp.com",
    projectId: "coach-pocket",
    storageBucket: "coach-pocket.firebasestorage.app",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function run() {
    const email = "YOUR_ADMIN_EMAIL@example.com"; // Provide a registered coach account
    const password = "YOUR_PASSWORD";               // Provide account password

    try {
        console.log(`Logging in as ${email}...`);
        const userCred = await signInWithEmailAndPassword(auth, email, password);
        console.log("Logged in successfully. Reading users.csv...");

        const csvPath = path.join(process.cwd(), 'users.csv');
        if (!fs.existsSync(csvPath)) {
            console.error("users.csv not found. Execute 'npx firebase-tools auth:export users.csv' first.");
            return;
        }

        const data = fs.readFileSync(csvPath, 'utf-8');
        const rows = data.split('\n').filter(r => r.trim() !== '');

        let count = 0;

        // Skip CSV Header
        for (let i = 1; i < rows.length; i++) {
            // Safe split of CSV columns disregarding commas inside quotes
            const row = rows[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            if (!row || row.length < 2) continue;

            const uid = row[0]?.replace(/^"|"$/g, '');
            const emailAddr = row[1]?.replace(/^"|"$/g, '');
            const displayName = row[7]?.replace(/^"|"$/g, '') || 'Coach';

            if (uid && emailAddr) {
                await setDoc(doc(db, 'users', uid), {
                    uid: uid,
                    email: emailAddr,
                    displayName: displayName,
                    role: 'coach',
                    createdAt: new Date(),
                    photoURL: null
                });
                console.log(`+ Synced document for: ${emailAddr}`);
                count++;
            }
        }
        console.log(`\nSuccessfully backfilled ${count} users into Firestore.`);
    } catch (e) {
        console.error("Failed:", e);
    }
}

run();
