import { NextResponse } from 'next/server';
import { db } from '@coach-pocket/core';
import { collection, doc, setDoc, getDocs } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

export async function GET() {
    try {
        const csvPath = path.join(process.cwd(), 'users.csv');

        if (!fs.existsSync(csvPath)) {
            return NextResponse.json({
                success: false,
                error: "users.csv not found. Execute 'npx firebase-tools auth:export users.csv' in the terminal first."
            }, { status: 404 });
        }

        const data = fs.readFileSync(csvPath, 'utf-8');
        const rows = data.split('\n').filter(r => r.trim() !== '');

        let count = 0;

        // Skip CSV Header
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            if (!row || row.length < 2) continue;

            const uid = row[0]?.replace(/^"|"$/g, '');
            const emailAddr = row[1]?.replace(/^"|"$/g, '');
            const displayName = row[7]?.replace(/^"|"$/g, '') || 'Coach';

            if (uid && emailAddr) {
                // Since this runs inside an API route, you can batch write
                await setDoc(doc(db, 'users', uid), {
                    uid: uid,
                    email: emailAddr,
                    displayName: displayName,
                    role: 'coach',
                    createdAt: new Date(),
                    photoURL: null
                }, { merge: true }); // Merge keeps existing roles if populated
                count++;
            }
        }

        return NextResponse.json({
            success: true,
            message: `Successfully synchronized ${count} users into Firestore!`
        });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
