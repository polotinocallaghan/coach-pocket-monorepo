'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Calendar as CalendarIcon,
    Clock,
    MapPin,
    ChevronRight,
    Activity,
    PlayCircle,
    MessageSquare,
    BookOpen,
    Video,
    TrendingUp,
    Flame,
    Target,
    Award,
    Users,
    Shield,
    BarChart3,
    FileCheck
} from 'lucide-react';
import { format, isToday, isTomorrow, differenceInDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { dataStore, CalendarEvent } from '@coach-pocket/core';
import { useAuth } from '@coach-pocket/core';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

// ─── Helpers ───
function getGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
}

function relativeDay(date: Date): string {
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    const diff = differenceInDays(date, new Date());
    if (diff < 7) return format(date, 'EEEE');
    return format(date, 'MMM d');
}

export default function PlayerDashboard() {
    const { user } = useAuth();
    const router = useRouter();

    // ─── Real data ───
    const events = dataStore.getCalendarEvents();
    const sessions = dataStore.getSessions();
    const profile = dataStore.getUserProfile();
    const teams = dataStore.getTeams();
    const coachNotes = dataStore.getCoachNotesForPlayer();
    const teamName = teams.length > 0 ? teams[0].name : 'Your Team';

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const upcomingEvents = events
        .filter(e => new Date(e.date) >= now)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Today's practice
    const todaysPractice = upcomingEvents.find(e =>
        isToday(new Date(e.date)) && (e.type === 'session' || e.type === 'team-session')
    );
    const nextEvent = todaysPractice || upcomingEvents[0] || null;

    // This week events
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    const thisWeekEvents = events
        .filter(e => {
            const d = new Date(e.date);
            return d >= weekStart && d <= weekEnd;
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Monthly stats
    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());
    const monthEvents = events.filter(e => {
        const d = new Date(e.date);
        return d >= monthStart && d <= monthEnd;
    });
    const practicesMonth = monthEvents.filter(e => e.type === 'session' || e.type === 'team-session').length;
    const matchesMonth = monthEvents.filter(e => e.type === 'match').length;
    const winsMonth = monthEvents.filter(e => e.result === 'win').length;

    // Practice attendance %
    const totalScheduled = monthEvents.filter(e => e.type === 'session' || e.type === 'team-session').length;
    const attendedCount = monthEvents.filter(e =>
        (e.type === 'session' || e.type === 'team-session') && e.completed
    ).length;
    const attendancePercent = totalScheduled > 0 ? Math.round((attendedCount / totalScheduled) * 100) : 100;

    // Session drill list
    const nextSessionDetails = nextEvent?.sessionId
        ? sessions.find(s => s.id === nextEvent.sessionId)
        : null;
    const allExercises = dataStore.getExercises();
    const todaysDrills = nextSessionDetails?.exercises.slice(0, 6).map(se => {
        const ex = allExercises.find(e => e.id === se.exerciseId);
        return {
            id: se.id,
            title: ex?.title || 'Exercise',
            duration: se.duration || ex?.duration || 10,
            block: se.block
        };
    }) || [];

    const firstName = user?.displayName?.split(' ')[0] || profile?.name?.split(' ')[0] || 'Player';

    // ─── Animations ───
    const stagger = {
        hidden: {},
        show: { transition: { staggerChildren: 0.06 } }
    };
    const fadeUp = {
        hidden: { opacity: 0, y: 14 },
        show: { opacity: 1, y: 0, transition: { duration: 0.35 } }
    };

    const blockColor: Record<string, string> = {
        'warm-up': 'text-amber-400',
        'technical': 'text-blue-400',
        'situational': 'text-purple-400',
        'competitive': 'text-red-400',
        'cool-down': 'text-teal-400',
    };

    return (
        <motion.div
            className="space-y-6 max-w-5xl mx-auto"
            variants={stagger}
            initial="hidden"
            animate="show"
        >
            {/* ─── Welcome Header ─── */}
            <motion.div variants={fadeUp} className="pt-2 flex items-center justify-between">
                <div>
                    <p className="text-slate-500 text-sm font-medium">{getGreeting()}</p>
                    <h1 className="text-2xl font-bold text-white mt-1">{firstName}</h1>
                </div>
                <div className="flex items-center gap-2 bg-indigo-950/40 border border-indigo-500/20 rounded-full px-4 py-1.5">
                    <Shield className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">{teamName}</span>
                </div>
            </motion.div>

            {/* ─── Today's Practice ─── */}
            <motion.div variants={fadeUp}>
                {nextEvent ? (
                    <div
                        className="bg-indigo-950/30 border border-indigo-500/15 rounded-2xl p-6 cursor-pointer hover:border-indigo-500/30 transition-all group relative overflow-hidden"
                        onClick={() => nextEvent.sessionId && router.push(`/session/${nextEvent.sessionId}`)}
                    >
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />

                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                                        <Activity className="w-4 h-4 text-indigo-400" />
                                    </div>
                                    <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">
                                        {todaysPractice ? "Today's Practice" : `Next · ${relativeDay(new Date(nextEvent.date))}`}
                                    </span>
                                </div>
                                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                            </div>

                            <h2 className="text-lg font-bold text-white mb-3 group-hover:text-indigo-300 transition-colors">
                                {nextEvent.title}
                            </h2>

                            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                                <span className="flex items-center gap-1.5">
                                    <CalendarIcon className="w-3.5 h-3.5 text-indigo-500/70" />
                                    {format(new Date(nextEvent.date), 'EEE, MMM d')}
                                </span>
                                {nextEvent.time && (
                                    <span className="flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5 text-indigo-500/70" />
                                        {nextEvent.time}
                                    </span>
                                )}
                                {(nextEvent as any).court && (
                                    <span className="flex items-center gap-1.5">
                                        <MapPin className="w-3.5 h-3.5 text-indigo-500/70" />
                                        {(nextEvent as any).court}
                                    </span>
                                )}
                            </div>

                            {/* Drill plan */}
                            {todaysDrills.length > 0 && (
                                <div className="mt-5 pt-4 border-t border-indigo-500/10">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                                        Practice Plan
                                    </p>
                                    <div className="space-y-1.5">
                                        {todaysDrills.map((drill, i) => (
                                            <div
                                                key={drill.id}
                                                className="flex items-center gap-3 text-sm"
                                            >
                                                <span className="w-5 text-[10px] font-bold text-slate-600">{(i + 1).toString().padStart(2, '0')}</span>
                                                <span className={cn("text-[10px] font-bold uppercase tracking-wider min-w-[70px]", blockColor[drill.block] || 'text-slate-500')}>
                                                    {drill.block}
                                                </span>
                                                <span className="text-slate-300 font-medium truncate flex-1">{drill.title}</span>
                                                <span className="text-xs text-slate-600 flex-shrink-0">{drill.duration}m</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="bg-slate-800/30 border border-slate-700/50 border-dashed rounded-2xl p-10 text-center">
                        <CalendarIcon className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                        <p className="text-sm text-slate-500">No practice scheduled</p>
                        <p className="text-xs text-slate-600 mt-1">Check back for team schedule updates</p>
                    </div>
                )}
            </motion.div>

            {/* ─── Performance Stats ─── */}
            <motion.div variants={fadeUp} className="grid grid-cols-4 gap-2">
                <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-white">{practicesMonth}</p>
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">Practices</p>
                </div>
                <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-white">{matchesMonth}</p>
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">Matches</p>
                </div>
                <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-3 text-center">
                    <p className={cn(
                        "text-xl font-bold",
                        winsMonth > 0 ? "text-emerald-400" : "text-white"
                    )}>{winsMonth}</p>
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">Wins</p>
                </div>
                <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-3 text-center">
                    <p className={cn(
                        "text-xl font-bold",
                        attendancePercent >= 80 ? "text-emerald-400" : attendancePercent >= 50 ? "text-amber-400" : "text-red-400"
                    )}>{attendancePercent}%</p>
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">Attendance</p>
                </div>
            </motion.div>

            {/* ─── Team Schedule ─── */}
            <motion.div variants={fadeUp}>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <h2 className="text-sm font-medium text-slate-500 uppercase tracking-widest">Team Schedule</h2>
                    </div>
                    <button
                        onClick={() => router.push('/calendar')}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                    >
                        Full Calendar →
                    </button>
                </div>

                {thisWeekEvents.length > 0 ? (
                    <div className="space-y-1">
                        {thisWeekEvents.map(event => {
                            const eventDate = new Date(event.date);
                            const isPast = eventDate < now;
                            return (
                                <div
                                    key={event.id}
                                    className={cn(
                                        "flex items-center gap-4 py-3 px-3 rounded-xl transition-colors group",
                                        isPast ? "opacity-40" : "hover:bg-slate-800/40 cursor-default"
                                    )}
                                >
                                    <div className="w-11 text-center flex-shrink-0">
                                        <span className="block text-[10px] font-bold text-slate-600 uppercase">
                                            {format(eventDate, 'EEE')}
                                        </span>
                                        <span className={cn(
                                            "block text-lg font-bold leading-none mt-0.5",
                                            isToday(eventDate) ? "text-indigo-400" : "text-white"
                                        )}>
                                            {format(eventDate, 'd')}
                                        </span>
                                    </div>

                                    <div className="w-px h-8 bg-slate-800" />

                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-200 truncate">
                                            {event.title}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {event.time || 'TBD'} · {event.type === 'team-session' ? 'Team Practice' : event.type}
                                        </p>
                                    </div>

                                    {/* Type badge */}
                                    <div className={cn(
                                        "text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                                        event.type === 'match' && "bg-amber-500/10 text-amber-400 border border-amber-500/20",
                                        event.type === 'match-prep' && "bg-purple-500/10 text-purple-400 border border-purple-500/20",
                                        (event.type === 'session' || event.type === 'team-session') && "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20",
                                        event.type === 'event' && "bg-blue-500/10 text-blue-400 border border-blue-500/20",
                                        !['session', 'team-session', 'match', 'match-prep', 'event'].includes(event.type) && "bg-slate-700/30 text-slate-500"
                                    )}>
                                        {event.type === 'team-session' ? 'team' : event.type}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="py-8 text-center text-sm text-slate-600">
                        No team events this week
                    </div>
                )}
            </motion.div>

            {/* ─── Coach Notes & Compliance ─── */}
            <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Coach Notes */}
                <div>
                    <h2 className="text-sm font-medium text-slate-500 uppercase tracking-widest mb-3">
                        Coach Notes
                    </h2>
                    {coachNotes.length > 0 ? (
                        <div className="space-y-2 max-h-[200px] overflow-y-auto">
                            {coachNotes.slice(0, 4).map(note => (
                                <div key={note.id} className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={cn(
                                            "text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full",
                                            note.type === 'technical' && "bg-blue-500/10 text-blue-400",
                                            note.type === 'mental' && "bg-purple-500/10 text-purple-400",
                                            note.type === 'tactical' && "bg-amber-500/10 text-amber-400"
                                        )}>
                                            {note.type}
                                        </span>
                                        <span className="text-[9px] text-slate-600 ml-auto">
                                            {format(new Date(note.updatedAt), 'MMM d')}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-300 line-clamp-2">{note.content}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-slate-800/30 border border-slate-700/40 border-dashed rounded-xl p-6 text-center h-[120px] flex flex-col items-center justify-center">
                            <MessageSquare className="w-7 h-7 text-slate-700 mb-2" />
                            <p className="text-xs text-slate-500">Tactical notes and video feedback from coaches</p>
                        </div>
                    )}
                </div>

                {/* Compliance */}
                <div>
                    <h2 className="text-sm font-medium text-slate-500 uppercase tracking-widest mb-3">
                        Compliance
                    </h2>
                    <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-4 space-y-3 h-[120px] flex flex-col justify-center">
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-xs text-slate-400">
                                <FileCheck className="w-3.5 h-3.5 text-emerald-500" />
                                Eligibility Status
                            </span>
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                ELIGIBLE
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-xs text-slate-400">
                                <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
                                Hours Logged (Week)
                            </span>
                            <span className="text-xs font-bold text-white">
                                {thisWeekEvents.filter(e => e.type === 'session' || e.type === 'team-session').length * 1.5}h
                            </span>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Bottom spacer for mobile nav */}
            <div className="h-4" />
        </motion.div>
    );
}
