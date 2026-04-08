'use client';

import { useState } from 'react';
import { db } from '@coach-pocket/core';
import { doc, setDoc } from 'firebase/firestore';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function BackfillPage() {
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const [log, setLog] = useState<string[]>([]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setStatus('loading');
        setMessage('Processing CSV list...');
        setLog([]);

        try {
            const text = await file.text();
            const rows = text.split('\n').filter(r => r.trim() !== '');

            if (rows.length < 2) {
                throw new Error("CSV file seems template-empty. Verify file contents.");
            }

            let count = 0;

            for (let i = 1; i < rows.length; i++) {
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
                    }, { merge: true });

                    setLog(prev => [...prev.slice(-10), `Synced: ${emailAddr}`]);
                    count++;
                }
            }

            setStatus('success');
            setMessage(`Successfully synchronized ${count} users into Firestore!`);

        } catch (error: any) {
            console.error("Backfill failed:", error);
            setStatus('error');
            setMessage(error.message || 'Backfill operation failed.');
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-slate-800 border border-slate-700 p-8 rounded-2xl shadow-xl">
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold text-white mb-2">Sync Missing Auth Users</h1>
                    <p className="text-slate-400 text-sm">Upload users.csv to bulk backfill Firestore records</p>
                </div>

                {status === 'loading' ? (
                    <div className="flex flex-col items-center justify-center p-6 space-y-4">
                        <Loader2 className="w-8 h-8 text-green-400 animate-spin" />
                        <p className="text-sm font-medium text-slate-200">{message}</p>
                        <div className="w-full bg-slate-900/50 p-2 rounded text-[10px] text-slate-500 font-mono h-24 overflow-y-auto">
                            {log.map((l, i) => <div key={i}>{l}</div>)}
                        </div>
                    </div>
                ) : status === 'success' ? (
                    <div className="flex flex-col items-center justify-center p-6 space-y-4">
                        <CheckCircle className="w-12 h-12 text-green-500" />
                        <p className="text-sm font-medium text-slate-200 text-center">{message}</p>
                        <button
                            onClick={() => setStatus('idle')}
                            className="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-sm transition-all"
                        >
                            Upload Another
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {status === 'error' && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
                                <AlertCircle className="w-4 h-4" />
                                <span>{message}</span>
                            </div>
                        )}

                        <div className="relative border-2 border-dashed border-slate-700 rounded-xl p-8 text-center hover:border-slate-500 transition-colors cursor-pointer group">
                            <input
                                type="file"
                                accept=".csv"
                                onChange={handleFileUpload}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                            <p className="text-sm text-slate-400 group-hover:text-slate-200">
                                Click or drag <strong className="text-green-400">users.csv</strong> here to start
                            </p>
                            <p className="text-[10px] text-slate-600 mt-1">Accepts Firebase Auth Export CSV layout</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
