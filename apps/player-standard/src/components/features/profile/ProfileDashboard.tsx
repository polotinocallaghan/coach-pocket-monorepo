'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    User,
    Users,
    Calendar,
    ChevronRight,
    Clock,
    Trophy,
    MapPin,
    Mail,
    Phone,
    LogOut,
    UserPlus,
    Book,
    BookOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { dataStore, CalendarSource, Team, CalendarEvent, SessionExercise } from '@coach-pocket/core';
import { format } from 'date-fns';
import { useAuth } from '@coach-pocket/core';
import { useRouter } from 'next/navigation';
import InvitationModal from '@/components/features/team/InvitationModal';
import AddPlayerModal from '@/components/features/team/AddPlayerModal';
import AddTeamModal from '@/components/features/team/AddTeamModal';
import EditTeamModal from '@/components/features/team/EditTeamModal';
import { TrainingPreferencesEditor, TrainingPreferencesViewer } from '@/components/features/profile/TrainingPreferences';

interface ProfileDashboardProps {
    isOpen: boolean;
    onClose: () => void;
}

type DetailTab = 'practices' | 'matches' | 'preferences';

export default function ProfileDashboard({ isOpen, onClose }: ProfileDashboardProps) {
    const { user, signOut } = useAuth();
    const router = useRouter();
    const [detailTab, setDetailTab] = useState<DetailTab>('practices');
    const [refreshKey, setRefreshKey] = useState(0);

    // Real User Profile from DataStore
    const realProfile = dataStore.getUserProfile();
    const activeRole = dataStore.getEffectiveRole();
    const isPlayer = activeRole === 'player';
    
    // Mock User Profile (Simulating logged-in user) -> Merged with real data
    const userProfile = {
        name: user?.displayName || realProfile?.name || "Guest",
        role: isPlayer ? "Player" : "Head Coach",
        club: "My Tennis Club", // Placeholder
        email: user?.email || realProfile?.email || "No email",
        image: user?.photoURL
    };

    const handleSignOut = async () => {
        await signOut();
        onClose();
    };

    // Data Fetching
    const players = useMemo(() => dataStore.getCalendarSources().filter(s => s.type === 'person'), [refreshKey]);
    const teams = useMemo(() => dataStore.getTeams(), [refreshKey]);

    // Derived Data for Selected Player
    const selectedPlayer = useMemo(() => {
        if (isPlayer) {
            return {
                id: realProfile?.id || 'user',
                name: realProfile?.name || 'Me',
                initials: realProfile?.name ? realProfile.name.charAt(0).toUpperCase() : 'ME',
                color: 'bg-green-500', // Default color for self
                type: 'person' as const
            };
        }
        return realProfile ? {
            id: realProfile.id || 'user',
            name: realProfile.name || 'Me',
            initials: realProfile.name ? realProfile.name.charAt(0).toUpperCase() : 'ME',
            color: 'bg-green-500', 
            type: 'person' as const,
            trainingPreferences: realProfile.trainingPreferences
        } : undefined;
    }, [isPlayer, realProfile]);

    const playerSessions = useMemo(() => {
        // If player, fetch all their events (already filtered by DataStore/CalendarPage logic usually, but here getCalendarEvents returns all for current user context)
        // actually getCalendarEvents returns events. If we pass an ID it filters by sourceId.
        // For a player, their events are their own.
        const targetId = undefined; // For a player, events are derived automatically based on their user ID in calendar queries

        if (!isPlayer) return { upcoming: [], past: [], practices: [], matches: [] };

        const rawEvents = dataStore.getCalendarEvents();
        const allEvents = targetId 
            ? rawEvents.filter(e => e.sourceId === targetId)
            : rawEvents;
        const now = new Date();

        return {
            upcoming: allEvents.filter(e => new Date(e.date) >= now).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
            past: allEvents.filter(e => new Date(e.date) < now).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
            practices: allEvents.filter(e => (e.type === 'session' || e.type === 'team-session')).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
            matches: allEvents.filter(e => e.type === 'match').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        };
    }, [isPlayer]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-slate-900 w-full max-w-5xl h-[85vh] rounded-2xl border border-slate-700 shadow-2xl flex overflow-hidden"
            >
                {/* Sidebar / Main Content Split */}
                <div className="flex w-full h-full">

                    {/* Left Sidebar: Profile & Navigation */}
                    <div className="w-80 bg-slate-800/50 border-r border-slate-700 flex flex-col p-6">
                        {/* Profile Header */}
                        <div className="text-center mb-8">
                            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-green-500/20 mb-4">
                                <User className="w-10 h-10 text-white" />
                            </div>
                            <h2 className="text-xl font-bold text-white">{userProfile.name}</h2>
                            <p className="text-sm text-green-400 font-medium">{userProfile.role}</p>
                            <p className="text-xs text-slate-400 mt-1">{userProfile.email}</p>
                        </div>

                        {/* Navigation Tabs */}
                        <div className="space-y-2 mb-auto">
                            <button
                                onClick={() => { router.push('/notebook'); onClose(); }}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-all font-bold uppercase tracking-wider text-xs"
                            >
                                <div className="p-1.5 rounded-lg bg-slate-700/50">
                                    <BookOpen className="w-4 h-4" />
                                </div>
                                Player's Notebook
                            </button>
                        </div>

                        {/* Removed App View Mode toggle */}

                        {/* Footer */}
                        <div className="pt-6 border-t border-slate-700 space-y-3">
                            <button onClick={handleSignOut} className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition text-sm font-medium border border-red-500/20">
                                <LogOut className="w-4 h-4" />
                                Sign Out
                            </button>
                            <button onClick={onClose} className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-sm font-medium">
                                <X className="w-4 h-4" />
                                Close Dashboard
                            </button>
                        </div>
                    </div>

                    {/* Right Content Area */}
                    <div className="flex-1 bg-slate-900 p-8 overflow-y-auto">
                        <AnimatePresence mode="wait">
                                {/* Player Detail View */}
                                <motion.div
                                    key="player-detail"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-8"
                                >
                                    {/* Header */}
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-xl font-bold text-slate-400 border border-slate-700">
                                                {selectedPlayer?.initials || selectedPlayer?.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h2 className="text-2xl font-bold text-white">{selectedPlayer?.name}</h2>
                                                <div className="flex items-center gap-2 text-sm text-slate-400">
                                                    <span className="px-2 py-0.5 bg-slate-800 rounded text-xs border border-slate-700">Player</span>
                                                    {!isPlayer && (
                                                        <>
                                                            <span>•</span>
                                                            <span>Player ID: #{selectedPlayer?.id}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Tabs for Practices, Matches, Preferences */}
                                    <div className="flex border-b border-slate-800">
                                        <button
                                            onClick={() => setDetailTab('practices')}
                                            className={cn(
                                                "px-6 py-3 font-bold text-sm border-b-2 transition-all",
                                                detailTab === 'practices' ? "border-green-500 text-green-400" : "border-transparent text-slate-400 hover:text-white"
                                            )}
                                        >
                                            🏆 Practice History ({playerSessions.practices.length})
                                        </button>
                                        <button
                                            onClick={() => setDetailTab('matches')}
                                            className={cn(
                                                "px-6 py-3 font-bold text-sm border-b-2 transition-all",
                                                detailTab === 'matches' ? "border-green-500 text-green-400" : "border-transparent text-slate-400 hover:text-white"
                                            )}
                                        >
                                            🎖 Match History ({playerSessions.matches.length})
                                        </button>
                                        <button
                                            onClick={() => setDetailTab('preferences')}
                                            className={cn(
                                                "px-6 py-3 font-bold text-sm border-b-2 transition-all whitespace-nowrap",
                                                detailTab === 'preferences' ? "border-green-500 text-green-400" : "border-transparent text-slate-400 hover:text-white"
                                            )}
                                        >
                                            🔥 Preferences
                                        </button>
                                    </div>

                                    {/* Session History */}
                                    <div className="space-y-6">
                                        {detailTab === 'preferences' ? (
                                            <div>
                                                {isPlayer ? (
                                                    <TrainingPreferencesEditor
                                                        initialPreferences={realProfile?.trainingPreferences}
                                                        onSave={async (newPreferences) => {
                                                            if (realProfile) {
                                                                await dataStore.updateUserProfile({ trainingPreferences: newPreferences });
                                                                setRefreshKey(k => k + 1); // trigger re-render
                                                            }
                                                        }}
                                                    />
                                                ) : (
                                                    <TrainingPreferencesViewer 
                                                        preferences={selectedPlayer && 'trainingPreferences' in selectedPlayer ? selectedPlayer.trainingPreferences : undefined} 
                                                    />
                                                )}
                                            </div>
                                        ) : detailTab === 'practices' ? (
                                            <div>
                                                {playerSessions.practices.length > 0 ? (
                                                    <div className="grid gap-4">
                                                        {playerSessions.practices.map((session, index) => (
                                                            <PracticeCard key={`${session.id}-${index}`} session={session} />
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-slate-500 text-sm italic py-8 bg-slate-800/30 rounded-lg text-center border border-slate-800">
                                                        No practices history found.
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div>
                                                {playerSessions.matches.length > 0 ? (
                                                    <div className="grid gap-4">
                                                        {playerSessions.matches.map((match, index) => (
                                                            <MatchCard key={`${match.id}-${index}`} match={match} />
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-slate-500 text-sm italic py-8 bg-slate-800/30 rounded-lg text-center border border-slate-800">
                                                        No match history found.
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                </motion.div>
                        </AnimatePresence>
                    </div>
                </div>

            </motion.div >
        </div >
    );
}

function SessionCard({ session, status }: { session: CalendarEvent, status: 'upcoming' | 'past' }) {
    return (
        <div className={cn(
            "p-4 rounded-xl border transition-all flex items-center justify-between",
            status === 'upcoming'
                ? "bg-slate-800 border-slate-700 hover:border-green-500/50"
                : "bg-slate-900 border-slate-800 opacity-75 hover:opacity-100"
        )}>
            <div className="flex items-center gap-4">
                <div className={cn(
                    "w-12 h-12 rounded-lg flex flex-col items-center justify-center font-bold text-white",
                    status === 'upcoming' ? "bg-green-600" : "bg-slate-700 text-slate-400"
                )}>
                    <span className="text-xs uppercase">{format(new Date(session.date), 'MMM')}</span>
                    <span className="text-lg leading-none">{format(new Date(session.date), 'd')}</span>
                </div>
                <div>
                    <h4 className="font-bold text-white">{session.title}</h4>
                    <p className="text-xs text-slate-400 mt-0.5 max-w-sm truncate">{session.notes || 'No description'}</p>
                </div>
            </div>

            <div className="text-right">
                <span className={cn(
                    "text-xs font-bold uppercase px-2 py-1 rounded",
                    status === 'upcoming' ? "bg-green-500/10 text-green-400" : "bg-slate-800 text-slate-500"
                )}>
                    {status}
                </span>
            </div>
        </div>
    );
}

function PracticeCard({ session }: { session: CalendarEvent }) {
    // Fetch individual session from store if it has exercises linked
    const fullSession = session.sessionId ? dataStore.getSession(session.sessionId) : null;
    const date = new Date(session.date);
    const isUpcoming = date >= new Date();

    return (
        <div className={cn(
            "p-5 rounded-xl border bg-slate-800/50 border-slate-700/50 hover:bg-slate-800 transition-all space-y-4",
            isUpcoming ? "border-green-500/30" : "border-slate-800"
        )}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className={cn(
                        "w-12 h-12 rounded-lg flex flex-col items-center justify-center font-bold text-white shadow-lg",
                        isUpcoming ? "bg-green-600" : "bg-slate-700 text-slate-400"
                    )}>
                        <span className="text-xs uppercase">{format(date, 'MMM')}</span>
                        <span className="text-lg leading-none">{format(date, 'd')}</span>
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className="font-bold text-white text-base">{session.title}</h4>
                            {isUpcoming && (
                                <span className="px-2 py-0.5 bg-green-500/10 text-green-400 rounded-full text-xs font-semibold">Upcoming</span>
                            )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{session.notes || 'General Practice'}</p>
                    </div>
                </div>
                <div className="text-slate-500 text-xs font-medium bg-slate-900/50 px-2 py-1 rounded">
                    {format(date, 'h:mm a')}
                </div>
            </div>

            {/* Exercises List if available */}
            {fullSession && fullSession.exercises && fullSession.exercises.length > 0 && (
                <div className="pt-3 border-t border-slate-700/50">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Book className="w-3" /> Drills / Exercises ({fullSession.exercises.length})
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {fullSession.exercises.map((drill: SessionExercise, idx: number) => {
                            const exercise = dataStore.getExercise(drill.exerciseId);
                            return (
                                <div key={idx} className="bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-700 text-sm font-medium text-slate-300 flex items-center gap-1 hover:text-green-400 transition-colors cursor-pointer">
                                    <div className="w-1 h-1 bg-green-500 rounded-full" />
                                    {exercise ? exercise.title : `Exercise ${idx + 1}`}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

function MatchCard({ match }: { match: CalendarEvent }) {
    const date = new Date(match.date);
    const isUpcoming = date >= new Date();

    return (
        <div className={cn(
            "p-5 rounded-xl border bg-slate-800/50 border-slate-700/50 hover:bg-slate-800 transition-all space-y-3",
            match.result === 'win' ? "border-green-500/20" : match.result === 'loss' ? "border-red-500/20" : "border-slate-800"
        )}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className={cn(
                        "w-12 h-12 rounded-lg flex flex-col items-center justify-center font-bold text-white shadow-lg",
                        match.result === 'win' ? "bg-green-600" : match.result === 'loss' ? "bg-red-600" : "bg-indigo-600"
                    )}>
                        <span className="text-xs uppercase">{format(date, 'MMM')}</span>
                        <span className="text-lg leading-none">{format(date, 'd')}</span>
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className="font-bold text-white text-base">{match.title}</h4>
                            {isUpcoming && <span className="text-xs px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-full">Upcoming</span>}
                        </div>
                        {match.opponent && (
                            <p className="text-xs text-slate-400 mt-0.5">vs {match.opponent}</p>
                        )}
                    </div>
                </div>
                
                <div className="text-right">
                    {match.score ? (
                        <div className="bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-700 font-bold text-slate-200 text-sm">
                            {match.score}
                        </div>
                    ) : (
                        <span className="text-slate-500 text-xs italic">No score</span>
                    )}
                    {match.result && (
                        <span className={cn(
                            "text-2xs font-bold uppercase mt-1 block",
                            match.result === 'win' ? "text-green-400" : "text-red-400"
                        )}>
                            {match.result}
                        </span>
                    )}
                </div>
            </div>

            {match.notes && (
                <p className="text-xs text-slate-400 bg-slate-900/50 p-2 rounded-lg border border-slate-800/80 max-w-full">
                    <strong className="text-slate-300">Notes:</strong> {match.notes}
                </p>
            )}
        </div>
    );
}
