"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@coach-pocket/core';
import { fsSetProfile, fsLinkPlayerToCoach } from '@coach-pocket/core';
import { Dumbbell, Mail, Lock, User, Loader2, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';
import { dataStore } from '@coach-pocket/core';

function SignUpContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Check for invitation params
    const inviteRole = searchParams.get('role'); // 'player'
    const inviteCoachId = searchParams.get('coachId');
    const invitePlayerId = searchParams.get('playerId');
    const invitePlayerName = searchParams.get('playerName');
    const isPlayerInvite = inviteRole === 'player' && !!inviteCoachId;

    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (invitePlayerName) {
            setUsername(invitePlayerName);
        }
    }, [invitePlayerName]);

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        if (password.length < 6) {
            setError('Password must be at least 6 characters long.');
            setLoading(false);
            return;
        }

        try {
            // 1. Create User in Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 2. Update Display Name
            await updateProfile(user, {
                displayName: username,
            });

            // 3. Create User Document in Firestore (CRITICAL FOR SEARCH)
            await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                email: user.email,
                displayName: username,
                role: isPlayerInvite ? 'player' : 'coach',
                createdAt: new Date(),
                photoURL: user.photoURL || null
            });

            // 4. Create User Profile in DataStore
            // Initialize their isolate store first
            dataStore.initForUser(user.uid);

            const userProfile: any = {
                id: user.uid,
                role: isPlayerInvite ? 'player' : 'coach',
                name: username,
                email: email,
                createdAt: new Date()
            };
            if (inviteCoachId) userProfile.connectedCoachId = inviteCoachId;
            if (invitePlayerId) userProfile.linkedPlayerId = invitePlayerId;

            // Set the profile locally and in Firestore immediately so syncFromFirestore doesn't overwrite
            dataStore.setUserProfile(userProfile);
            await fsSetProfile(user.uid, userProfile);

            // 5. Auto-link player → coach's CalendarSource
            if (inviteCoachId && invitePlayerId) {
                await fsLinkPlayerToCoach(inviteCoachId, invitePlayerId, user.uid, email);
                console.log('Player linked to coach CalendarSource:', invitePlayerId, '→', user.uid);
            }

            console.log('User registered:', user.uid, isPlayerInvite ? 'as Player' : 'as Coach');

            // 6. Redirect
            router.push('/');
        } catch (err: any) {
            console.error('Registration error:', err);
            // Firebase error mapping
            if (err.code === 'auth/email-already-in-use') {
                setError('This email is already registered. Try logging in.');
            } else if (err.code === 'auth/invalid-email') {
                setError('Please enter a valid email address.');
            } else if (err.code === 'auth/weak-password') {
                setError('Password is too weak.');
            } else {
                setError(err.message || 'Failed to register. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md bg-slate-800/50 backdrop-blur-xl p-8 rounded-2xl border border-slate-700/50 shadow-xl relative overflow-hidden">

            {/* Decorative Background Elements */}
            <div className="absolute top-0 right-0 p-8 opacity-5">
                <Dumbbell className="w-32 h-32 text-white transform rotate-12" />
            </div>

            <div className="text-center mb-8 relative z-10">
                <Link href="/" className="inline-flex items-center gap-2 mb-6 group">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/20 group-hover:scale-105 transition-transform">
                        <Dumbbell className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xl font-bold text-white tracking-tight">Coach<span className="text-green-400">Pocket</span></span>
                </Link>
                <h1 className="text-2xl font-bold text-white mb-2">
                    {isPlayerInvite ? 'Join Your Team' : 'Create Account'}
                </h1>
                <p className="text-slate-400 text-sm">
                    {isPlayerInvite
                        ? 'Register to access your player dashboard.'
                        : 'Start your coaching journey today.'}
                </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSignUp} className="space-y-4 relative z-10">
                {/* ... existing fields ... */}
                <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider ml-1">Username</label>
                    <div className="relative group">
                        <User className="absolute left-3 top-3 w-5 h-5 text-slate-500 group-focus-within:text-green-400 transition-colors" />
                        <input
                            type="text"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition-all placeholder:text-slate-600"
                            placeholder="Coach Mike"
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider ml-1">Email</label>
                    <div className="relative group">
                        <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-500 group-focus-within:text-green-400 transition-colors" />
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition-all placeholder:text-slate-600"
                            placeholder="mike@example.com"
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider ml-1">Password</label>
                    <div className="relative group">
                        <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-500 group-focus-within:text-green-400 transition-colors" />
                        <input
                            type="password"
                            required
                            minLength={6}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition-all placeholder:text-slate-600"
                            placeholder="••••••••"
                        />
                    </div>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-200">{error}</p>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-green-500/20 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Creating Account...
                        </>
                    ) : (
                        <>
                            Sign Up
                            <ArrowRight className="w-5 h-5" />
                        </>
                    )}
                </button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-400 relative z-10">
                Already have an account?{' '}
                <Link href="/login" className="text-green-400 hover:text-green-300 font-semibold hover:underline decoration-green-400/30 underline-offset-4">
                    Sign In
                </Link>
            </div>
        </div>
    );
}

export default function SignUpPage() {
    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Gradients */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] bg-green-500/10 rounded-full blur-[120px]" />
                <div className="absolute top-[40%] -right-[10%] w-[60%] h-[60%] bg-blue-500/10 rounded-full blur-[100px]" />
            </div>

            <Suspense fallback={<div className="text-white">Loading...</div>}>
                <SignUpContent />
            </Suspense>
        </div>
    );
}
