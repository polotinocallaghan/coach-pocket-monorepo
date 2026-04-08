'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, Trophy, ChevronRight, Plus, Dumbbell,
    TrendingUp, TrendingDown, Minus, Star, Shield,
    LayoutGrid, History, UserCheck
} from 'lucide-react';
import { dataStore, CalendarSource, CalendarEvent, Team } from '@coach-pocket/core';
import { cn } from '@/lib/utils';

// ─── HELPERS ────────────────────────────────────────────────────────────────

function getResultBadge(result?: string) {
    if (result === 'win') return { label: 'W', bg: 'bg-green-500/20 text-green-400 border-green-500/30' };
    if (result === 'loss') return { label: 'L', bg: 'bg-red-500/20 text-red-400 border-red-500/30' };
    return { label: '–', bg: 'bg-slate-700/50 text-slate-400 border-slate-600/30' };
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────

export default function TeamDashboardWidget() {
    const router = useRouter();
    const [players, setPlayers] = useState<CalendarSource[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [matchEvents, setMatchEvents] = useState<CalendarEvent[]>([]);
    const [activeTab, setActiveTab] = useState<'roster' | 'matches'>('roster');

    useEffect(() => {
        const load = () => {
            const sources = dataStore.getCalendarSources();
            setPlayers(sources.filter(s => s.type === 'person'));
            setTeams(dataStore.getTeams());

            const events = dataStore.getCalendarEvents();
            const matches = events
                .filter(e => e.type === 'match')
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 5);
            setMatchEvents(matches);
        };

        load();
        const unsub = dataStore.subscribe(load);
        return () => unsub();
    }, []);

    // Team win/loss stats
    const wins = matchEvents.filter(m => m.result === 'win').length;
    const losses = matchEvents.filter(m => m.result === 'loss').length;
    const winRate = matchEvents.length > 0 ? Math.round((wins / matchEvents.length) * 100) : null;

    const tabs = [
        { id: 'roster', label: 'Roster', icon: UserCheck },
        { id: 'matches', label: 'Match History', icon: History },
    ] as const;

    return (
        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/40 border border-slate-700/50 rounded-2xl overflow-hidden backdrop-blur-sm">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-700/50">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-white">Team HQ</h2>
                        <p className="text-[11px] text-slate-400 font-medium">College Edition</p>
                    </div>
                </div>

                {/* Win/Loss Badge */}
                {matchEvents.length > 0 && (
                    <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 bg-green-500/15 text-green-400 text-xs font-bold px-2.5 py-1 rounded-lg border border-green-500/20">
                            <Trophy className="w-3 h-3" /> {wins}W
                        </span>
                        <span className="flex items-center gap-1 bg-red-500/15 text-red-400 text-xs font-bold px-2.5 py-1 rounded-lg border border-red-500/20">
                            {losses}L
                        </span>
                        {winRate !== null && (
                            <span className="text-slate-400 text-xs font-bold">{winRate}%</span>
                        )}
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-700/50 px-4 pt-1">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "relative flex items-center gap-1.5 px-4 py-3 text-xs font-bold transition-all",
                                isActive ? "text-white" : "text-slate-500 hover:text-slate-300"
                            )}
                        >
                            <Icon className="w-3.5 h-3.5" />
                            {tab.label}
                            {isActive && (
                                <motion.div
                                    layoutId="teamTabIndicator"
                                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full"
                                />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            <div className="p-4">
                <AnimatePresence mode="wait">
                    {activeTab === 'roster' && (
                        <motion.div
                            key="roster"
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.2 }}
                        >
                            {/* Player List */}
                            {players.length === 0 ? (
                                <div className="py-10 text-center">
                                    <Users className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                                    <p className="text-slate-500 text-sm font-medium">No players on roster yet</p>
                                    <button
                                        onClick={() => router.push('/players')}
                                        className="mt-3 text-xs text-blue-400 hover:text-blue-300 font-bold transition"
                                    >
                                        Go to Players →
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-1.5">
                                    {players.slice(0, 6).map((player, i) => (
                                        <motion.button
                                            key={player.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.04 }}
                                            onClick={() => router.push(`/player/${player.id}`)}
                                            className="w-full flex items-center gap-3 p-2.5 hover:bg-slate-700/50 rounded-xl transition-all group"
                                        >
                                            {/* Avatar */}
                                            <div className={cn(
                                                "w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black text-white shadow-md flex-shrink-0",
                                                player.color || "bg-gradient-to-br from-blue-400 to-indigo-600"
                                            )}>
                                                {player.imageUrl
                                                    ? <img src={player.imageUrl} alt={player.name} className="w-full h-full object-cover rounded-xl" />
                                                    : (player.initials || player.name.substring(0, 2).toUpperCase())
                                                }
                                            </div>

                                            {/* Name */}
                                            <span className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors flex-1 text-left truncate">
                                                {player.name}
                                            </span>

                                            <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-blue-400 transition-colors flex-shrink-0" />
                                        </motion.button>
                                    ))}

                                    {/* Show more */}
                                    {players.length > 6 && (
                                        <button
                                            onClick={() => router.push('/players')}
                                            className="w-full py-2 text-xs text-slate-500 hover:text-blue-400 font-bold transition text-center"
                                        >
                                            +{players.length - 6} more athletes →
                                        </button>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {activeTab === 'matches' && (
                        <motion.div
                            key="matches"
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.2 }}
                        >
                            {matchEvents.length === 0 ? (
                                <div className="py-10 text-center">
                                    <Trophy className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                                    <p className="text-slate-500 text-sm font-medium">No match results logged yet</p>
                                    <button
                                        onClick={() => router.push('/calendar')}
                                        className="mt-3 text-xs text-blue-400 hover:text-blue-300 font-bold transition"
                                    >
                                        Log a match →
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-1.5">
                                    {matchEvents.map((match, i) => {
                                        const badge = getResultBadge(match.result);
                                        const matchDate = new Date(match.date);
                                        return (
                                            <motion.div
                                                key={match.id}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.05 }}
                                                className="flex items-center gap-3 p-2.5 hover:bg-slate-700/40 rounded-xl transition-all"
                                            >
                                                {/* W/L Badge */}
                                                <span className={cn(
                                                    "w-7 h-7 rounded-lg border flex items-center justify-center text-xs font-black flex-shrink-0",
                                                    badge.bg
                                                )}>
                                                    {badge.label}
                                                </span>

                                                {/* Match Info */}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-white truncate">
                                                        {match.opponent ? `vs ${match.opponent}` : match.title}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        {match.score && (
                                                            <span className="text-[10px] text-slate-400 font-mono font-bold">{match.score}</span>
                                                        )}
                                                        <span className="text-[10px] text-slate-600">
                                                            {matchDate.toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Trend icon */}
                                                {match.result === 'win'
                                                    ? <TrendingUp className="w-4 h-4 text-green-400 flex-shrink-0" />
                                                    : match.result === 'loss'
                                                    ? <TrendingDown className="w-4 h-4 text-red-400 flex-shrink-0" />
                                                    : <Minus className="w-4 h-4 text-slate-600 flex-shrink-0" />
                                                }
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Footer Actions */}
            <div className="border-t border-slate-700/50 p-4 flex gap-3">
                {/* Build Practice */}
                <button
                    onClick={() => router.push('/team')}
                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3 px-4 rounded-xl font-bold text-xs transition-all shadow-lg shadow-blue-500/20 group"
                >
                    <LayoutGrid className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                    Build Practice
                </button>

                {/* Manage Roster */}
                <button
                    onClick={() => router.push('/players')}
                    className="flex items-center justify-center gap-2 bg-slate-700/60 hover:bg-slate-700 border border-slate-600/50 text-slate-300 hover:text-white py-3 px-4 rounded-xl font-bold text-xs transition-all"
                >
                    <Users className="w-3.5 h-3.5" />
                    Roster
                </button>
            </div>
        </div>
    );
}
