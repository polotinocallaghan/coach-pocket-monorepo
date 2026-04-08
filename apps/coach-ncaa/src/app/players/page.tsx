'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Plus, UserPlus, Users, ChevronRight, X, Check,
    Trophy, LayoutGrid, TrendingUp, TrendingDown, Minus,
    Activity, Zap, BarChart2, Shield
} from 'lucide-react';
import { dataStore, CalendarSource, CalendarEvent, Team, TeamMember } from '@coach-pocket/core';
import { cn, generateId } from '@/lib/utils';

// ─── TYPES ───────────────────────────────────────────────────────────────────
type HealthStatus = 'full' | 'limited' | 'out';
const healthConfig: Record<HealthStatus, { label: string; dotColor: string; textColor: string }> = {
    full:    { label: 'Full',    dotColor: 'bg-green-400',  textColor: 'text-green-400'  },
    limited: { label: 'Limited', dotColor: 'bg-yellow-400', textColor: 'text-yellow-400' },
    out:     { label: 'Out',     dotColor: 'bg-red-500',    textColor: 'text-red-400'    },
};

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────
export default function PlayersPage() {
    const router = useRouter();
    const [players, setPlayers] = useState<CalendarSource[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [matchEvents, setMatchEvents] = useState<CalendarEvent[]>([]);
    const [selectedTeamId, setSelectedTeamId] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);

    // Stubbed health statuses (extend with real data later)
    const [healthMap] = useState<Record<string, HealthStatus>>({});
    const getHealth = (id: string): HealthStatus => healthMap[id] ?? 'full';

    const load = useCallback(() => {
        const sources = dataStore.getCalendarSources();
        const playerSources = sources.filter(s => s.type === 'person');
        setPlayers(playerSources);

        const allTeams = dataStore.getTeams();
        setTeams(allTeams);
        if (!selectedTeamId && allTeams.length > 0) {
            setSelectedTeamId(allTeams[0].id);
        }

        const events = dataStore.getCalendarEvents();
        setMatchEvents(
            events
                .filter(e => e.type === 'match')
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 5)
        );
    }, [selectedTeamId]);

    useEffect(() => {
        load();
        const unsub = dataStore.subscribe(load);
        return () => unsub();
    }, [load]);

    const activeTeam = teams.find(t => t.id === selectedTeamId) ?? teams[0];

    // Roster: if a team is selected, show its members; otherwise show all players
    const rosterPlayers = useMemo(() => {
        const list = activeTeam?.members?.length
            ? players.filter(p => activeTeam.members.some(m => m.id === p.id))
            : players;
        return list.filter(p =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [players, activeTeam, searchQuery]);

    // Match stats
    const wins = matchEvents.filter(m => m.result === 'win').length;
    const losses = matchEvents.filter(m => m.result === 'loss').length;
    const winRate = matchEvents.length > 0 ? Math.round((wins / matchEvents.length) * 100) : null;

    // Volume chart – last 7 days
    const now = new Date();
    const allEvents = dataStore.getCalendarEvents();
    const chartDays = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() - (6 - i));
        const label = d.toLocaleDateString('en', { weekday: 'short' }).slice(0, 2);
        const dayEvents = allEvents.filter(e => {
            const ed = new Date(e.date);
            return ed.toDateString() === d.toDateString();
        });
        const hours = dayEvents.length * 1.5;
        const type = dayEvents[0]?.type === 'match' ? 'Match' :
                     dayEvents[0]?.type === 'session' ? 'Technical' : 'Rest';
        return { label, hours, type };
    });
    const maxHours = Math.max(...chartDays.map(d => d.hours), 1);
    const typeColors: Record<string, string> = {
        Technical: 'bg-blue-500',
        Match:     'bg-purple-500',
        Physical:  'bg-green-500',
        Rest:      'bg-slate-700',
    };

    return (
        <div className="pb-20 animate-in fade-in duration-500">
            <div className="max-w-[1400px] mx-auto px-6 py-8 space-y-6">

                {/* ── HEADER ─────────────────────────────────────────────── */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                            <Shield className="w-8 h-8 text-blue-400" />
                            Team Mode
                        </h1>
                        <p className="text-slate-400 text-sm mt-1 font-medium">
                            Multi-court academy management
                            {teams.length > 1 && (
                                <span className="ml-2">
                                    for{' '}
                                    <select
                                        value={selectedTeamId}
                                        onChange={e => setSelectedTeamId(e.target.value)}
                                        className="bg-slate-700 text-white text-xs font-bold px-2 py-1 rounded-lg border border-slate-600 focus:outline-none focus:border-blue-500 ml-1"
                                    >
                                        {teams.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                </span>
                            )}
                            {teams.length === 1 && activeTeam && (
                                <span className="ml-1 font-black text-white">{activeTeam.name}</span>
                            )}
                        </p>
                    </div>

                    <button
                        onClick={() => setShowCreateGroupModal(true)}
                        className="flex items-center gap-2 bg-green-500 hover:bg-green-400 active:scale-95 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-green-500/20"
                    >
                        <Plus className="w-4 h-4" />
                        New Team
                    </button>
                </div>

                {/* ── ACTIVE TEAM BADGE ──────────────────────────────────── */}
                {activeTeam && (
                    <div className="flex items-center gap-4">
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="text-4xl font-black text-white tracking-tight">
                                    {activeTeam.name.toUpperCase()}
                                </h2>
                                <span className="flex items-center gap-1.5 bg-green-500/15 text-green-400 text-xs font-black px-3 py-1 rounded-full border border-green-500/30">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                    ACTIVE
                                </span>
                            </div>
                            <p className="text-slate-500 text-sm mt-1 font-medium lowercase">
                                {activeTeam.type} · {activeTeam.courtCount} courts
                            </p>
                        </div>
                    </div>
                )}

                {/* ── MAIN GRID ──────────────────────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* ── LEFT: ROSTER ─────────────────────────────────────── */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* Roster header */}
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black flex items-center gap-2">
                                <Users className="w-3 h-3" />
                                Roster · {rosterPlayers.length} Players
                            </p>
                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                                    <input
                                        type="text"
                                        placeholder="Search..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="bg-slate-800/60 border border-slate-700/50 rounded-xl py-2 pl-9 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 transition-all w-44"
                                    />
                                </div>
                                <button
                                    onClick={() => {/* add player inline */}}
                                    className="p-2 bg-slate-800/60 hover:bg-slate-700 border border-slate-700/50 text-slate-400 hover:text-white rounded-xl transition-all"
                                >
                                    <UserPlus className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Player rows */}
                        <div className="space-y-2">
                            <AnimatePresence mode="popLayout">
                                {rosterPlayers.map((player, i) => {
                                    const health = getHealth(player.id);
                                    const hConf = healthConfig[health];
                                    return (
                                        <motion.div
                                            key={player.id}
                                            layout
                                            initial={{ opacity: 0, x: -12 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -12 }}
                                            transition={{ duration: 0.25, delay: i * 0.04 }}
                                            onClick={() => router.push(`/player/${player.id}`)}
                                            className="flex items-center gap-4 bg-slate-800/50 border border-slate-700/40 hover:border-blue-500/40 hover:bg-slate-800/80 rounded-2xl px-5 py-4 cursor-pointer group transition-all"
                                        >
                                            {/* Health dot accent bar */}
                                            <div className={cn("w-1 h-10 rounded-full flex-shrink-0", hConf.dotColor)} />

                                            {/* Avatar */}
                                            <div className={cn(
                                                "w-11 h-11 rounded-xl flex items-center justify-center text-sm font-black text-white shadow-md flex-shrink-0",
                                                player.color || "bg-gradient-to-br from-blue-400 to-indigo-600"
                                            )}>
                                                {player.imageUrl
                                                    ? <img src={player.imageUrl} alt={player.name} className="w-full h-full object-cover rounded-xl" />
                                                    : (player.initials || player.name.substring(0, 2).toUpperCase())
                                                }
                                            </div>

                                            {/* Name */}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-white group-hover:text-blue-400 transition-colors text-sm truncate">
                                                    {player.name}
                                                </p>
                                                <p className={cn("text-xs font-semibold mt-0.5", hConf.textColor)}>
                                                    {hConf.label}
                                                </p>
                                            </div>

                                            <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400 transition-colors flex-shrink-0" />
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>

                            {/* Empty state */}
                            {rosterPlayers.length === 0 && (
                                <div className="py-16 text-center bg-slate-800/20 rounded-2xl border border-dashed border-slate-700">
                                    <Users className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                                    <p className="text-slate-500 font-semibold">No athletes on roster yet</p>
                                    <p className="text-slate-600 text-sm mt-1">Add players to get started</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── RIGHT: ACTIONS + STATS ──────────────────────────── */}
                    <div className="space-y-5">

                        {/* BUILD PRACTICE CTA */}
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => router.push('/team')}
                            className="w-full flex items-center justify-between bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white px-6 py-5 rounded-2xl font-black text-base shadow-xl shadow-green-500/30 transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <LayoutGrid className="w-5 h-5" />
                                Build Today's Practice
                            </div>
                            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </motion.button>

                        {/* VOLUME CARD */}
                        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <BarChart2 className="w-4 h-4 text-slate-400" />
                                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black">Volume · 7 Days</p>
                            </div>

                            {/* Bar chart */}
                            <div className="flex items-end gap-1.5 h-20">
                                {chartDays.map((d, i) => (
                                    <motion.div
                                        key={d.label}
                                        className="flex-1 flex flex-col items-center gap-1"
                                        initial={{ opacity: 0, scaleY: 0 }}
                                        animate={{ opacity: 1, scaleY: 1 }}
                                        transition={{ delay: i * 0.07, duration: 0.4 }}
                                        style={{ transformOrigin: 'bottom' }}
                                    >
                                        <div
                                            className={cn(
                                                "w-full rounded-t-md transition-all",
                                                typeColors[d.type] ?? 'bg-slate-700'
                                            )}
                                            style={{ height: `${(d.hours / maxHours) * 64}px`, minHeight: d.hours > 0 ? '4px' : '0' }}
                                            title={`${d.label}: ${d.hours}h`}
                                        />
                                        <span className="text-[9px] text-slate-500 font-medium">{d.label}</span>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Legend */}
                            <div className="flex items-center gap-3 mt-3">
                                {['Tactical','Technical','Physical'].map(t => (
                                    <div key={t} className="flex items-center gap-1.5">
                                        <div className={cn("w-2 h-2 rounded-full", typeColors[t] ?? 'bg-slate-500')} />
                                        <span className="text-[9px] text-slate-500 font-bold">{t}</span>
                                    </div>
                                ))}
                            </div>

                            {allEvents.length === 0 && (
                                <p className="text-center text-[10px] text-slate-600 mt-2 italic">No sessions logged</p>
                            )}
                        </div>

                        {/* MATCH HISTORY */}
                        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Trophy className="w-4 h-4 text-slate-400" />
                                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black">Match History</p>
                                </div>
                                {winRate !== null && (
                                    <span className="text-xs font-black text-white">{wins}W–{losses}L · {winRate}%</span>
                                )}
                            </div>

                            {matchEvents.length === 0 ? (
                                <div className="py-8 text-center">
                                    <Trophy className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                                    <p className="text-slate-600 text-xs font-medium">No matches logged yet</p>
                                    <button
                                        onClick={() => router.push('/calendar')}
                                        className="mt-2 text-[10px] text-blue-400 hover:text-blue-300 font-bold transition uppercase tracking-wider"
                                    >
                                        Log a match →
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {matchEvents.map((match, i) => {
                                        const isWin  = match.result === 'win';
                                        const isLoss = match.result === 'loss';
                                        return (
                                            <motion.div
                                                key={match.id}
                                                initial={{ opacity: 0, x: 8 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.05 }}
                                                className="flex items-center gap-3 py-2"
                                            >
                                                <span className={cn(
                                                    "w-7 h-7 rounded-lg border flex items-center justify-center text-xs font-black flex-shrink-0",
                                                    isWin  && "bg-green-500/20 text-green-400 border-green-500/30",
                                                    isLoss && "bg-red-500/20 text-red-400 border-red-500/30",
                                                    !isWin && !isLoss && "bg-slate-700/50 text-slate-500 border-slate-600/30"
                                                )}>
                                                    {isWin ? 'W' : isLoss ? 'L' : '–'}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-white truncate">
                                                        {match.opponent ? `vs ${match.opponent}` : match.title}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        {match.score && (
                                                            <span className="text-[10px] text-slate-400 font-mono font-bold">{match.score}</span>
                                                        )}
                                                        <span className="text-[10px] text-slate-600">
                                                            {new Date(match.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                                                        </span>
                                                    </div>
                                                </div>
                                                {isWin  && <TrendingUp   className="w-4 h-4 text-green-400 flex-shrink-0" />}
                                                {isLoss && <TrendingDown className="w-4 h-4 text-red-400   flex-shrink-0" />}
                                                {!isWin && !isLoss && <Minus className="w-4 h-4 text-slate-600 flex-shrink-0" />}
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </div>

            {/* ── CREATE GROUP MODAL ──────────────────────────────────────── */}
            <AnimatePresence>
                {showCreateGroupModal && (
                    <CreateGroupModal
                        allPlayers={players}
                        onClose={() => setShowCreateGroupModal(false)}
                        onSave={(newTeam) => {
                            dataStore.addTeam(newTeam);
                            load();
                            setShowCreateGroupModal(false);
                            setSelectedTeamId(newTeam.id);
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── CREATE GROUP MODAL ───────────────────────────────────────────────────────
function CreateGroupModal({
    allPlayers, onClose, onSave,
}: {
    allPlayers: CalendarSource[];
    onClose: () => void;
    onSave: (team: Team) => void;
}) {
    const [name, setName] = useState('');
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    const toggle = (id: string) =>
        setSelectedPlayerIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);

    const handleSave = () => {
        if (!name.trim()) return;
        const newTeam: Team = {
            id: generateId(),
            name,
            type: 'university',
            courtCount: 4,
            members: selectedPlayerIds.map(pId => {
                const p = allPlayers.find(ap => ap.id === pId);
                return { id: pId, name: p?.name ?? 'Unknown', role: 'player' };
            }),
        };
        onSave(newTeam);
    };

    const pool = allPlayers.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 20 }}
                className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
            >
                <div className="p-7 border-b border-slate-800 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-white">New <span className="text-green-400">Team</span></h2>
                        <p className="text-slate-500 text-xs mt-1 font-bold uppercase tracking-widest">Add a squad or group</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-400 transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-7 space-y-6">
                    <div>
                        <label className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black mb-3 block">Team Name</label>
                        <input
                            type="text"
                            placeholder="Varsity Men's..."
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-2xl py-4 px-5 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500/50 transition-all"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black mb-3 block">
                            Add Players ({selectedPlayerIds.length})
                        </label>
                        <div className="relative mb-3">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search players..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-800/30 border border-slate-800/50 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-slate-700 transition-all"
                            />
                        </div>
                        <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                            {pool.map(player => (
                                <div
                                    key={player.id}
                                    onClick={() => toggle(player.id)}
                                    className={cn(
                                        "flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border",
                                        selectedPlayerIds.includes(player.id)
                                            ? "bg-green-500/10 border-green-500/30"
                                            : "bg-slate-800/30 border-transparent hover:bg-slate-800/50"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black text-white", player.color ?? 'bg-slate-600')}>
                                            {player.initials ?? player.name.slice(0, 2).toUpperCase()}
                                        </div>
                                        <span className="text-sm font-bold text-white">{player.name}</span>
                                    </div>
                                    <div className={cn(
                                        "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                                        selectedPlayerIds.includes(player.id) ? "bg-green-500 border-green-500" : "border-slate-700"
                                    )}>
                                        {selectedPlayerIds.includes(player.id) && <Check className="w-3 h-3 text-white" />}
                                    </div>
                                </div>
                            ))}
                            {pool.length === 0 && (
                                <p className="text-center text-slate-600 text-xs italic py-4">No players found</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-7 pt-0 flex items-center gap-4">
                    <button onClick={onClose} className="flex-1 py-4 text-slate-500 font-bold text-xs uppercase tracking-widest hover:text-white transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!name.trim()}
                        className="flex-1 py-4 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-green-500/20 transition-all"
                    >
                        Create Team
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
