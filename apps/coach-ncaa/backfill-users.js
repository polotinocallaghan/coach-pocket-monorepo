const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

// Since we may not have a service account file readily available, 
// we can use the default credential or project ID.
// If you have a service account json file, provide it here.
initializeApp({
    projectId: 'coach-pocket' // Replace if necessary, or omit to auto-detect
});

const auth = getAuth();
const db = getFirestore();

async function backfill() {
    console.log("Fetching auth users...");
    let nextPageToken;
    let count = 0;

    try {
        const listUsersResult = await auth.listUsers(1000);

        for (const userRecord of listUsersResult.users) {
            const userDocRef = db.collection('users').doc(userRecord.uid);
            const docSnap = await userDocRef.get();

            if (!docSnap.exists) {
                await userDocRef.set({
                    uid: userRecord.uid,
                    email: userRecord.email,
                    displayName: userRecord.displayName || 'User',
                    role: 'coach', // fallback, or omit to let them set it later
                    createdAt: new Date(),
                    photoURL: userRecord.photoURL || null
                });
                console.log(`+ Added user document for: ${userRecord.email}`);
                count++;
            }
        }
        console.log(`\nDone! Created ${count} missing user documents.`);
    } catch (error) {
        console.error("Backfill failed:", error);
    }
}

backfill();
