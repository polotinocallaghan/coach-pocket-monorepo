'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Calendar, Clock, UserCheck, Dumbbell, BookOpen, Users, 
    MessageSquare, Plus, TrendingUp, Trophy, ChevronDown, ChevronUp,
    MoreVertical, ArrowRight, Play, Settings, Bell,
    Activity, Eye, ChevronRight, CheckCircle2
} from 'lucide-react';
import { dataStore, CalendarEvent } from '@coach-pocket/core';
import { useDataStore } from '@/lib/useDataStore';
import { format, addDays, startOfWeek, isSameDay, endOfWeek, eachDayOfInterval } from 'date-fns';
import { cn } from '@/lib/utils';
import QuickSessionGenerator from './QuickSessionGenerator';

export default function CoachDashboard() {
    const router = useRouter();
    
    // Real-time globally synced states
    const calendarEvents = useDataStore(() => dataStore.getCalendarEvents());
    const exercises = useDataStore(() => dataStore.getExercises());
    const sessions = useDataStore(() => dataStore.getSessions());
    const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

    const toggleSessionExpansion = (sessionId: string) => {
        setExpandedSessionId(expandedSessionId === sessionId ? null : sessionId);
    };

    const getSessionExercises = (sessionId: string) => {
        const session = sessions.find(s => s.id === sessionId);
        if (!session) return [];
        return session.exercises.map(ex => {
            const exerciseDef = exercises.find(e => e.id === ex.exerciseId);
            return {
                ...ex,
                title: exerciseDef?.title || 'Unknown Exercise',
                category: exerciseDef?.category || 'drill',
                duration: ex.duration || exerciseDef?.duration || 0
            };
        });
    };

    // Get next 7 days for week view
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    // Helper to convert UTC stored date to Local date (ignoring timezone shift)
    const getLocalDate = (date: Date) => {
        return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    };

    const getEventsForDate = (date: Date) => {
        return calendarEvents.filter(event => {
            const eventDate = new Date(event.date); // Ensure it's a Date object
            // If the date is stored as UTC midnight (common from date pickers), 
            // treat the UTC components as local components to match the "intended" day
            const normalizedEventDate = getLocalDate(eventDate);
            return isSameDay(normalizedEventDate, date);
        });
    };

    return (
        <div className="pb-20 md:pb-0 animate-in fade-in duration-500">
            {/* Content now starts without duplicate header - FluidNavigator handles nav */}
            <div className="max-w-[1600px] mx-auto px-6 py-8">

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Week Calendar View */}
                    <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-white">This Week</h2>
                            <button
                                onClick={() => router.push('/calendar')}
                                className="text-sm text-green-400 hover:text-green-300 transition"
                            >
                                View Full Calendar →
                            </button>
                        </div>

                        {/* Week Grid */}
                        <div className="grid grid-cols-7 gap-2">
                            {weekDays.map((day, idx) => {
                                const dayEvents = getEventsForDate(day);
                                const isToday = isSameDay(day, today);
                                const isPast = day < today && !isToday;

                                return (
                                    <div
                                        key={idx}
                                        className={`rounded-xl p-3 transition cursor-pointer ${isToday
                                            ? 'bg-green-500/20 border-2 border-green-500'
                                            : isPast
                                                ? 'bg-slate-700/30 opacity-60'
                                                : 'bg-slate-700/50 hover:bg-slate-700'
                                            }`}
                                        onClick={() => router.push('/calendar')}
                                    >
                                        <div className="text-center">
                                            <div className={`text-xs font-medium mb-1 ${isToday ? 'text-green-400' : 'text-slate-400'}`}>
                                                {format(day, 'EEE')}
                                            </div>
                                            <div className={`text-2xl font-bold mb-2 ${isToday ? 'text-white' : 'text-slate-300'}`}>
                                                {format(day, 'd')}
                                            </div>

                                            {/* Event dots */}
                                            <div className="flex flex-col gap-1">
                                                {dayEvents.slice(0, 3).map((event, i) => (
                                                    <div
                                                        key={i}
                                                        className={`h-1.5 rounded-full ${event.type === 'session' ? 'bg-green-500' :
                                                            event.type === 'match' ? 'bg-purple-500' :
                                                                'bg-blue-500'
                                                            }`}
                                                    />
                                                ))}
                                                {dayEvents.length > 3 && (
                                                    <div className="text-[10px] text-slate-500">+{dayEvents.length - 3}</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Today's Sessions */}
                        <div className="mt-6 pt-6 border-t border-slate-700">
                            <h3 className="text-sm font-semibold text-slate-400 mb-3">TODAY'S SCHEDULE</h3>
                            {getEventsForDate(today).length === 0 ? (
                                <div className="space-y-3">
                                    {/* Minimal empty row */}
                                    <div className="flex items-center justify-between py-4 px-4 rounded-xl bg-slate-700/20 border border-dashed border-slate-700/60">
                                        <span className="text-sm text-slate-500">Nothing planned for today</span>
                                        <button
                                            onClick={() => {
                                                const params = new URLSearchParams();
                                                params.set('modal', 'new-session');
                                                router.push(`/?${params.toString()}`);
                                            }}
                                            className="text-xs text-green-400 hover:text-green-300 font-medium flex items-center gap-1 transition"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            Add session
                                        </button>
                                    </div>

                                    {/* Next upcoming event hint */}
                                    {(() => {
                                        const futureEvents = calendarEvents
                                            .filter(e => {
                                                const eventDate = new Date(e.date);
                                                const normalizedEventDate = getLocalDate(eventDate);
                                                return normalizedEventDate > todayStart;
                                            })
                                            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                                        const nextEvent = futureEvents[0];
                                        if (!nextEvent) return null;
                                        const nextDate = getLocalDate(new Date(nextEvent.date));
                                        return (
                                            <div className="flex items-center gap-2 px-1 text-xs text-slate-500">
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500/70" />
                                                Next up: <span className="text-slate-400">{nextEvent.title}</span> — {format(nextDate, 'EEE, MMM d')}
                                            </div>
                                        );
                                    })()}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {getEventsForDate(today).map((event, index) => {
                                        const isExpanded = expandedSessionId === event.sessionId;
                                        const sessionExercises = event.sessionId ? getSessionExercises(event.sessionId) : [];

                                        return (
                                            <div key={`${event.id}-${index}`} className="bg-slate-700/50 rounded-lg overflow-hidden transition-all duration-300">
                                                <div
                                                    className="flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-700/70 transition"
                                                    onClick={() => event.sessionId && toggleSessionExpansion(event.sessionId)}
                                                >
                                                    <div className={`w-1 h-12 rounded-full ${event.type === 'session' ? 'bg-green-500' :
                                                        event.type === 'match' ? 'bg-purple-500' :
                                                            'bg-blue-500'
                                                        }`} />
                                                    <div className="flex-1">
                                                        <div className="font-medium text-white">{event.title}</div>
                                                        <div className="text-sm text-slate-400 flex items-center gap-2">
                                                            {event.time || 'No time set'}
                                                            {event.sessionId && (
                                                                <span className="text-xs bg-slate-600/50 px-1.5 py-0.5 rounded text-slate-300">
                                                                    {sessionExercises.length} exercises
                                                                </span>
                                                            )}
                                                            {event.sessionId && sessions.find(s => s.id === event.sessionId)?.playerFeedback && (
                                                                <span className="flex items-center gap-1 text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                                                    <MessageSquare className="w-3 h-3" />
                                                                    Feedback
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {event.sessionId && (
                                                        <button className="p-1 hover:bg-slate-600 rounded-full transition">
                                                            {isExpanded ? (
                                                                <ChevronUp className="w-5 h-5 text-slate-400" />
                                                            ) : (
                                                                <ChevronDown className="w-5 h-5 text-slate-400" />
                                                            )}
                                                        </button>
                                                    )}

                                                    {event.sessionId && (
                                                        <button
                                                            className="px-3 py-1 bg-green-500/20 text-green-400 text-sm rounded-lg hover:bg-green-500/30 transition ml-2 z-10 relative"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                router.push(`/session/${event.sessionId}`);
                                                            }}
                                                        >
                                                            Start
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Expanded Content */}
                                                {isExpanded && event.sessionId && (
                                                    <div className="px-3 pb-3 pt-0 animate-in slide-in-from-top-2 duration-200">
                                                        <div className="pl-4 border-l-2 border-slate-600 ml-1.5 space-y-2 mt-2">
                                                            {sessionExercises.map((ex, idx) => (
                                                                <div key={idx} className="flex items-center justify-between text-sm group">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-slate-500 text-xs w-4">{idx + 1}.</span>
                                                                        <span className="text-slate-300 group-hover:text-white transition">{ex.title}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-3">
                                                                        <span className={cn(
                                                                            "text-[10px] px-1.5 py-0.5 rounded capitalize",
                                                                            ex.category === 'drill' && "bg-blue-500/10 text-blue-400",
                                                                            ex.category === 'game' && "bg-green-500/10 text-green-400",
                                                                            ex.category === 'basket' && "bg-purple-500/10 text-purple-400",
                                                                            ex.category === 'points' && "bg-yellow-500/10 text-yellow-400"
                                                                        )}>
                                                                            {ex.category}
                                                                        </span>
                                                                        <span className="text-slate-500 text-xs w-12 text-right">{ex.duration}m</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {/* Player Feedback Summary */}
                                                        {(() => {
                                                            const session = sessions.find(s => s.id === event.sessionId);
                                                            const feedback = session?.playerFeedback;
                                                            if (!feedback) return null;
                                                            return (
                                                                <div className="mt-4 p-3 bg-slate-800/80 rounded-xl border border-emerald-500/20">
                                                                    <div className="flex items-center justify-between mb-3 text-[10px] sm:text-xs">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-xl">
                                                                                {feedback.enjoyment === 1 && "😫"}
                                                                                {feedback.enjoyment === 2 && "😕"}
                                                                                {feedback.enjoyment === 3 && "😐"}
                                                                                {feedback.enjoyment === 4 && "😊"}
                                                                                {feedback.enjoyment === 5 && "🤩"}
                                                                            </span>
                                                                            <span className="text-sm font-bold text-white uppercase tracking-wider">Player Feedback</span>
                                                                        </div>
                                                                        <div className="text-slate-500 font-medium whitespace-nowrap">
                                                                            {format(new Date(feedback.submittedAt), 'MMM d, HH:mm')}
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-3">
                                                                        {Object.entries(feedback.featureRatings).map(([key, val]) => (
                                                                            <div key={key} className="flex items-center justify-between text-[11px]">
                                                                                <span className="text-slate-400 capitalize">{key}</span>
                                                                                <div className="flex gap-0.5">
                                                                                    {[1,2,3,4,5].map(v => (
                                                                                        <Star key={v} className={cn("w-2.5 h-2.5", v <= (val as number) ? "text-emerald-400 fill-current" : "text-slate-700")} />
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                    
                                                                    {feedback.comment && (
                                                                        <div className="bg-slate-900/50 p-2.5 rounded-lg text-xs text-slate-300 italic border-l-2 border-emerald-500/50">
                                                                            "{feedback.comment}"
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Sidebar */}
                    <div className="space-y-6">
                        {/* Quick Session Generator */}
                        <QuickSessionGenerator />

                        {/* Create Program */}
                        <button
                            onClick={() => router.push('/program-builder')}
                            className="w-full group bg-gradient-to-br from-emerald-500/10 to-green-600/5 border border-emerald-500/20 hover:border-emerald-500/40 rounded-2xl p-5 text-left transition-all hover:shadow-lg hover:shadow-emerald-500/5"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/30 transition">
                                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                                </div>
                                <div>
                                    <h3 className="text-white font-bold text-base">Create Program</h3>
                                    <p className="text-xs text-slate-400">Multi-week training blocks</p>
                                </div>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Exercise Library - Easy Access */}
                <div className="mt-6 bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-blue-400" />
                                Drill Library
                            </h3>
                            <p className="text-sm text-slate-400 mt-1">{exercises.length} exercises available</p>
                        </div>
                        <button
                            onClick={() => router.push('/library')}
                            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition font-medium"
                        >
                            Browse All
                            <span className="text-xs">→</span>
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {exercises.slice(0, 6).map((exercise, idx) => (
                            <div
                                key={`${exercise.id}-${idx}`}
                                onClick={() => router.push('/library')}
                                className="group bg-slate-700/50 rounded-xl p-4 hover:bg-slate-700 hover:scale-[1.02] transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-green-500/10"
                                style={{ animationDelay: `${idx * 50}ms` }}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <span className={cn(
                                        "px-3 py-1 rounded-full text-xs font-semibold transition-colors",
                                        exercise.category === 'drill' && "bg-blue-500/20 text-blue-400 group-hover:bg-blue-500/30",
                                        exercise.category === 'basket' && "bg-purple-500/20 text-purple-400 group-hover:bg-purple-500/30",
                                        exercise.category === 'points' && "bg-yellow-500/20 text-yellow-400 group-hover:bg-yellow-500/30",
                                        exercise.category === 'game' && "bg-green-500/20 text-green-400 group-hover:bg-green-500/30"
                                    )}>
                                        {exercise.category}
                                    </span>
                                    <div className="flex gap-2 text-xs text-slate-500">
                                        <Clock className="w-3 h-3" />
                                        {exercise.duration}min
                                    </div>
                                </div>
                                <h4 className="text-white font-semibold mb-2 group-hover:text-green-400 transition-colors">{exercise.title}</h4>
                                <p className="text-sm text-slate-400 line-clamp-2 mb-3">{exercise.description}</p>
                                <div className="flex flex-wrap gap-2">
                                    <span className="bg-slate-600/50 text-slate-300 px-2 py-0.5 rounded text-xs">
                                        {exercise.difficulty}
                                    </span>
                                    <span className="bg-slate-600/50 text-slate-300 px-2 py-0.5 rounded text-xs">
                                        {exercise.playerCount} players
                                    </span>
                                    {exercise.focusArea && (
                                        <span className="bg-slate-600/50 text-slate-300 px-2 py-0.5 rounded text-xs">
                                            {exercise.focusArea}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
