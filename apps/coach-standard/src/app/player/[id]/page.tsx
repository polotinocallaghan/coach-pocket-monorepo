'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { dataStore, CalendarEvent } from '@coach-pocket/core';
import { cn } from '@/lib/utils';
import { ArrowLeft, Trophy, BookOpen, Book,
    ChevronRight, Send, Brain, Shield, Crosshair, MessageSquare, X
} from 'lucide-react';
import { format, isBefore, isAfter, subDays } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { TrainingPreferencesViewer } from '@/components/features/profile/TrainingPreferences';




// ── Coach Notebook Sidebar ───────────────────────────────────────────────────
const CATEGORIES = [
    { id: 'mental', label: 'Mental', icon: <Brain className="w-3.5 h-3.5" /> },
    { id: 'technical', label: 'Technical', icon: <Shield className="w-3.5 h-3.5" /> },
    { id: 'tactical', label: 'Tactical', icon: <Crosshair className="w-3.5 h-3.5" /> },
] as const;

type Category = 'mental' | 'technical' | 'tactical';

const NOTEBOOK_KEY = (playerId: string, cat: Category) =>
    `coach_pocket_notebook_${playerId}_${cat}`;

function CoachNotebook({ playerId }: { playerId: string }) {
    const [activeCategory, setActiveCategory] = useState<Category>('mental');
    const [note, setNote] = useState('');
    const [saved, setSaved] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Load the note for the selected category
    useEffect(() => {
        const stored = localStorage.getItem(NOTEBOOK_KEY(playerId, activeCategory));
        setNote(stored || '');
    }, [playerId, activeCategory]);

    const handleSave = () => {
        localStorage.setItem(NOTEBOOK_KEY(playerId, activeCategory), note);
        setSaved(true);
        setTimeout(() => setSaved(false), 1800);
    };

    // Auto-save on Cmd/Ctrl+S
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                handleSave();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    });

    return (
        <div className="flex flex-col h-full bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700/40 bg-slate-800/60">
                <BookOpen className="w-4 h-4 text-green-400 flex-shrink-0" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">Player's Notebook</span>
            </div>

            {/* Category tabs */}
            <div className="flex border-b border-slate-700/40">
                {CATEGORIES.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={cn(
                            'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold transition-all',
                            activeCategory === cat.id
                                ? 'text-green-400 border-b-2 border-green-400 bg-green-500/5'
                                : 'text-slate-500 hover:text-slate-300'
                        )}
                    >
                        {cat.icon}
                        {cat.label}
                    </button>
                ))}
            </div>

            {/* Textarea */}
            <textarea
                ref={textareaRef}
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder={`${activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)} notes for this player...`}
                className="flex-1 w-full p-4 bg-transparent text-slate-200 placeholder-slate-600 focus:outline-none resize-none text-sm leading-relaxed"
                style={{
                    background: 'repeating-linear-gradient(transparent, transparent 27px, rgba(51,65,85,0.15) 27px, rgba(51,65,85,0.15) 28px)',
                    lineHeight: '28px',
                    paddingTop: '14px',
                    minHeight: 200,
                }}
            />

            {/* Save footer */}
            <div className="px-4 py-3 border-t border-slate-700/40 flex items-center justify-between">
                <span className="text-[10px] text-slate-600">⌘S to save</span>
                <button
                    onClick={handleSave}
                    className={cn(
                        'flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all',
                        saved
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                    )}
                >
                    <Send className="w-3 h-3" />
                    {saved ? 'Saved!' : 'Save'}
                </button>
            </div>
        </div>
    );
}

// ── Match Row ────────────────────────────────────────────────────────────────
function MatchRow({ match, onOpen }: { match: CalendarEvent; onOpen: () => void }) {
    const isWin = match.result === 'win';
    const isLoss = match.result === 'loss';

    return (
        <tr
            onClick={onOpen}
            className="border-b border-slate-800/80 hover:bg-slate-800/40 cursor-pointer transition-colors group"
        >
            <td className="px-5 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                {format(new Date(match.date), 'MMM d, yyyy')}
            </td>
            <td className="px-5 py-3.5">
                <div className="text-sm font-medium text-white">{match.title}</div>
                {match.opponent && (
                    <div className="text-[11px] text-slate-500 mt-0.5">vs {match.opponent}</div>
                )}
            </td>
            <td className="px-5 py-3.5">
                <span className={cn(
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold',
                    isWin ? 'bg-green-500/15 text-green-400' :
                        isLoss ? 'bg-red-500/15 text-red-400' :
                            match.completed ? 'bg-slate-600/40 text-slate-400' :
                                'bg-yellow-500/15 text-yellow-400'
                )}>
                    {isWin ? 'Win' : isLoss ? 'Loss' : match.completed ? 'Done' : 'Upcoming'}
                </span>
            </td>
            <td className="px-5 py-3.5 text-sm font-semibold text-white">
                {match.score || '—'}
            </td>
            <td className="px-5 py-3.5 text-right">
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 inline-block transition-colors" />
            </td>
        </tr>
    );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function PlayerDashboardPage() {
    const router = useRouter();
    const [showMessage, setShowMessage] = useState(false);
    const [messageText, setMessageText] = useState('');
    const [detailTab, setDetailTab] = useState<'practices' | 'matches'>('practices');
    const params = useParams();
    const playerId = params.id as string;

    const player = useMemo(() => {
        const sources = dataStore.getCalendarSources();
        return sources.find(s => s.id === playerId && s.type === 'person');
    }, [playerId]);

    const allEvents = useMemo(() => dataStore.getCalendarEvents(), []);
    const allTeams = useMemo(() => dataStore.getTeams(), []);

    const playerEvents = useMemo(() =>
        allEvents.filter(e => e.sourceId === playerId),
        [allEvents, playerId]
    );

    const playerTeams = useMemo(() =>
        allTeams.filter(t => t.members.some(m => m.id === playerId || m.name === player?.name)),
        [allTeams, player, playerId]
    );

    const matches = useMemo(() =>
        playerEvents
            .filter(e => e.type === 'match')
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        [playerEvents]
    );

    const practices = useMemo(() =>
        playerEvents
            .filter(e => e.type === 'session' || e.type === 'team-session' || e.type === 'match-prep')
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        [playerEvents]
    );

    const wins = matches.filter(m => m.result === 'win').length;
    const losses = matches.filter(m => m.result === 'loss').length;

    if (!player) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-xl font-bold text-white mb-2">Player not found</h2>
                    <button onClick={() => router.back()} className="text-emerald-400 hover:text-emerald-300 text-sm">
                        ← Go back
                    </button>
                </div>
            </div>
        );
    }

    const initials = player.initials ||
        player.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().substring(0, 2);

    return (
        <div className="pb-20 animate-in fade-in duration-400 space-y-6 max-w-[1300px] mx-auto">

            {/* ── HEADER ─────────────────────────────────────────────────── */}
            <div className="flex items-center gap-5">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition text-sm"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                </button>
            </div>

            <div className="flex items-center gap-5">
                {/* Avatar */}
                <div className={cn(
                    'w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white shadow-xl flex-shrink-0 border border-white/10',
                    player.color || 'bg-gradient-to-br from-emerald-500 to-teal-600'
                )}>
                    {initials}
                </div>

                {/* Name + team badges */}
                <div className="flex-1 min-w-0">
                    <h1 className="text-2xl font-black text-white">{player.name}</h1>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {playerTeams.map(t => (
                            <span key={t.id} className="text-[11px] bg-slate-800 text-slate-400 border border-slate-700 px-2.5 py-0.5 rounded-full font-medium">
                                {t.name}
                            </span>
                        ))}
                        {playerTeams.length === 0 && (
                            <span className="text-xs text-slate-600 italic">No team assigned</span>
                        )}
                        {matches.length > 0 && (
                            <span className="text-[11px] text-slate-500 ml-1">
                                {wins}W – {losses}L
                            </span>
                        )}
                    </div>
                </div>

                {/* Send Message button */}
                <button
                    onClick={() => setShowMessage(true)}
                    className="flex items-center gap-2 text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 hover:border-slate-500 px-4 py-2 rounded-xl transition-all flex-shrink-0"
                >
                    <MessageSquare className="w-4 h-4" />
                    Send Message
                </button>
            </div>

            {/* ── MESSAGE MODAL ─────────────────────────────────────────── */}
            {showMessage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowMessage(false)}>
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black text-white', player.color || 'bg-gradient-to-br from-emerald-500 to-teal-600')}>
                                    {initials}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white">Message {player.name}</p>
                                    <p className="text-[11px] text-slate-500">Sent as Coach</p>
                                </div>
                            </div>
                            <button onClick={() => setShowMessage(false)} className="text-slate-500 hover:text-white transition p-1">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <textarea
                            value={messageText}
                            onChange={e => setMessageText(e.target.value)}
                            placeholder={`Write a message to ${player.name.split(' ')[0]}...`}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-600 resize-none"
                            rows={4}
                            autoFocus
                        />
                        <div className="flex items-center justify-end gap-2 mt-3">
                            <button onClick={() => setShowMessage(false)} className="text-sm text-slate-500 hover:text-white px-4 py-2 transition">Cancel</button>
                            <button
                                onClick={() => { setShowMessage(false); setMessageText(''); }}
                                disabled={!messageText.trim()}
                                className="flex items-center gap-2 text-sm font-bold bg-green-500 hover:bg-green-400 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl transition-all"
                            >
                                <Send className="w-3.5 h-3.5" /> Send
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MIDDLE: Notebook + Training Preferences ─────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Coach Notebook */}
                <CoachNotebook playerId={playerId} />

                {/* Training Preferences (read-only view of player's own settings) */}
                <TrainingPreferencesViewer preferences={(player as any).trainingPreferences} />
            </div>

            {/* ── MATCH HISTORY ───────────────────────────────────────────── */}
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-700/40 bg-slate-800/20">
                    <Trophy className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                    <h2 className="text-sm font-bold text-white">Match History</h2>
                    {matches.length > 0 && (
                        <span className="ml-auto text-[10px] text-slate-500">{matches.length} matches</span>
                    )}
                </div>

                <div className="p-5">
                    {matches.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            <Trophy className="w-8 h-8 mx-auto mb-3 opacity-20" />
                            <p className="text-sm">No matches recorded yet</p>
                            <p className="text-xs mt-1 text-slate-600">Add matches from the Calendar</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-700/60">
                                        <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date</th>
                                        <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Opponent / Tournament</th>
                                        <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Result</th>
                                        <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Score</th>
                                        <th className="px-5 py-3" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {matches.map(match => (
                                        <MatchRow
                                            key={match.id}
                                            match={match}
                                            onOpen={() => router.push(`/match/${match.id}`)}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* ── PRACTICE HISTORY ─────────────────────────────────────────── */}
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-700/40 bg-slate-800/20">
                    <BookOpen className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <h2 className="text-sm font-bold text-white">Practice History</h2>
                    {practices.length > 0 && (
                        <span className="ml-auto text-[10px] text-slate-500">{practices.length} sessions</span>
                    )}
                </div>

                <div className="p-5">
                    {practices.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            <BookOpen className="w-8 h-8 mx-auto mb-3 opacity-20" />
                            <p className="text-sm">No practices recorded yet</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {practices.map((practice, index) => {
                                const date = new Date(practice.date);
                                const isUpcoming = date >= new Date();
                                const fullSession = practice.sessionId ? dataStore.getSession(practice.sessionId) : null;

                                return (
                                    <div key={`${practice.id}-${index}`} className={cn(
                                        "p-4 rounded-xl border bg-slate-900/50 hover:bg-slate-800/80 transition-all space-y-3 cursor-pointer group",
                                        isUpcoming ? "border-green-500/20 hover:border-green-500/40" : "border-slate-800 hover:border-slate-700"
                                    )} onClick={() => practice.sessionId && router.push(`/session/${practice.sessionId}`)}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-lg flex flex-col items-center justify-center font-bold text-white shadow",
                                                    isUpcoming ? "bg-green-600" : "bg-slate-700 text-slate-400"
                                                )}>
                                                    <span className="text-[10px] uppercase font-bold">{format(date, 'MMM')}</span>
                                                    <span className="text-base leading-none">{format(date, 'd')}</span>
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-1.5">
                                                        <h4 className="font-bold text-white text-sm group-hover:text-green-400 transition-colors">{practice.title}</h4>
                                                        {isUpcoming && <span className="text-[9px] px-1.5 py-0.5 bg-green-500/10 text-green-400 rounded-full font-medium">Upcoming</span>}
                                                    </div>
                                                    <p className="text-[11px] text-slate-500 mt-0.5">{practice.notes || 'General Practice'}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Listed Exercises */}
                                        {fullSession && fullSession.exercises && fullSession.exercises.length > 0 && (
                                            <div className="pt-2.5 border-t border-slate-800/80">
                                                <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                                    <Book className="w-2.5 h-2.5" /> Exercises & Drills ({fullSession.exercises.length})
                                                </div>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {fullSession.exercises.slice(0, 3).map((drill: any, idx: number) => {
                                                        const exercise = dataStore.getExercise(drill.exerciseId);
                                                        return (
                                                            <div key={idx} className="bg-slate-800/60 px-2 py-1 rounded-md border border-slate-800 text-[11px] font-medium text-slate-300 flex items-center gap-1">
                                                                <div className="w-1 h-1 bg-green-500 rounded-full" />
                                                                {exercise ? exercise.title : `Drill`}
                                                            </div>
                                                        );
                                                    })}
                                                    {fullSession.exercises.length > 3 && (
                                                        <div className="text-[10px] text-slate-500 self-center font-medium">
                                                            +{fullSession.exercises.length - 3} more
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
