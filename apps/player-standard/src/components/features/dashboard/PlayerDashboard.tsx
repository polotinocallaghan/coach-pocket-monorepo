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
    Sun,
    Target,
    Award
} from 'lucide-react';
import { format, isToday, isTomorrow, differenceInDays, startOfMonth, endOfMonth } from 'date-fns';
import { dataStore, CalendarEvent } from '@coach-pocket/core';
import { useAuth } from '@coach-pocket/core';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import FeedbackOverlay from '../feedback/FeedbackOverlay';

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

    // ─── Real data from store ───
    const events = dataStore.getCalendarEvents();
    const sessions = dataStore.getSessions();
    const profile = dataStore.getUserProfile();
    const coachNotes = dataStore.getCoachNotesForPlayer();

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const upcomingEvents = events
        .filter(e => new Date(e.date) >= now)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const nextLesson = upcomingEvents.find(e => e.type === 'session' || e.type === 'event') || upcomingEvents[0] || null;
    const weekEvents = upcomingEvents.slice(0, 5);

    // Monthly stats
    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());
    const monthEvents = events.filter(e => {
        const d = new Date(e.date);
        return d >= monthStart && d <= monthEnd;
    });
    const sessionsThisMonth = monthEvents.filter(e => e.type === 'session').length;
    const matchesThisMonth = monthEvents.filter(e => e.type === 'match').length;

    // Streak: consecutive days with events looking back from yesterday
    let streakCount = 0;
    const today = new Date();
    for (let i = 1; i <= 60; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        const hasEvent = events.some(e => {
            const d = new Date(e.date);
            return d.toDateString() === checkDate.toDateString();
        });
        if (hasEvent) streakCount++;
        else break;
    }

    // Session drill list for next lesson
    const nextSessionDetails = nextLesson?.sessionId
        ? sessions.find(s => s.id === nextLesson.sessionId)
        : null;
    const exercises = dataStore.getExercises();
    const assignedDrills = nextSessionDetails?.exercises.slice(0, 4).map(se => {
        const ex = exercises.find(e => e.id === se.exerciseId);
        return {
            id: se.id,
            title: ex?.title || 'Exercise',
            duration: se.duration || ex?.duration || 10,
            category: ex?.category || 'drill'
        };
    }) || [];

    const firstName = user?.displayName?.split(' ')[0] || profile?.name?.split(' ')[0] || 'Player';

    // ─── Feedback Detection ───
    const [pendingFeedback, setPendingFeedback] = useState<{ session: any; coachId: string } | null>(null);

    useEffect(() => {
        const coachId = profile?.connectedCoachId;
        if (!coachId || pendingFeedback) return;

        const now = new Date();
        // Look for sessions in the last 48 hours that ended and haven't been rated
        const pastSessions = sessions.filter(s => {
            const event = events.find(e => e.sessionId === s.id);
            if (!event) return false;

            const eventDate = new Date(event.date);
            if (event.time) {
                const [h, m] = event.time.split(':');
                eventDate.setHours(parseInt(h), parseInt(m));
            }
            
            // Assume session takes 1 hour
            const endDate = new Date(eventDate.getTime() + 60 * 60 * 1000);
            
            // Only sessions from the last 2 days to avoid spamming old history
            const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

            return endDate < now && endDate > twoDaysAgo && !s.playerFeedback;
        });

        if (pastSessions.length > 0) {
            setPendingFeedback({ session: pastSessions[0], coachId });
        }
    }, [sessions, events, profile, pendingFeedback]);

    // ─── Verification Test ───
    const createTestPastSession = async () => {
        if (!profile?.connectedCoachId) {
            alert("No connected coach found. Please connect to a coach first in settings.");
            return;
        }

        const coachId = profile.connectedCoachId;
        const sessionId = 'test-past-' + Date.now();
        const eventId = 'event-' + sessionId;
        
        // 10 minutes ago
        const pastDate = new Date();
        pastDate.setMinutes(pastDate.getMinutes() - 70); // End 10 mins ago (1hr duration)
        
        const timeStr = format(pastDate, 'HH:mm');

        const newSession = {
            id: sessionId,
            title: "Test Country Club Session",
            type: 'practice' as const,
            isTemplate: false,
            exercises: [],
            createdAt: new Date(),
            status: 'completed' as const
        };

        const newEvent = {
            id: eventId,
            title: "Test Country Club Session",
            date: pastDate,
            time: timeStr,
            type: 'session' as const,
            sessionId: sessionId,
            completed: true,
            sourceId: profile.linkedPlayerId
        };

        // In a real app we'd batch this or use a proper service. 
        // Here we push directly to Firestore paths via dataStore helpers if possible
        // Actually we need to add these to the COACH's path because player listens to coach
        
        const { fsAddSession, fsAddCalendarEvent } = await import('@coach-pocket/core/src/firebase/firestoreService');
        await fsAddSession(coachId, newSession);
        await fsAddCalendarEvent(coachId, newEvent);
        
        alert("Fake past practice created! Wait 2 seconds for sync...");
    };

    // ─── Animation variants ───
    const stagger = {
        hidden: {},
        show: { transition: { staggerChildren: 0.07 } }
    };
    const fadeUp = {
        hidden: { opacity: 0, y: 12 },
        show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
    };

    return (
        <motion.div
            className="space-y-6 max-w-5xl mx-auto"
            variants={stagger}
            initial="hidden"
            animate="show"
        >
            {/* ─── Welcome ─── */}
            <motion.div variants={fadeUp} className="pt-2 flex items-center justify-between">
                <div>
                    <p className="text-slate-500 text-sm font-medium">{getGreeting()}</p>
                    <h1 className="text-2xl font-bold text-white mt-1">
                        {firstName}
                    </h1>
                </div>
                <button 
                    onClick={createTestPastSession}
                    className="text-[10px] bg-slate-800 text-slate-500 px-2 py-1 rounded hover:bg-slate-700 transition-colors opacity-30 hover:opacity-100"
                >
                    DEBUG: TEST FEEDBACK
                </button>
            </motion.div>

            {/* ─── Next Lesson Card ─── */}
            <motion.div variants={fadeUp}>
                {nextLesson ? (
                    <div
                        className="bg-emerald-950/40 border border-emerald-500/15 rounded-2xl p-6 cursor-pointer hover:border-emerald-500/30 transition-all group"
                        onClick={() => nextLesson.sessionId && router.push(`/session/${nextLesson.sessionId}`)}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
                                Next Lesson · {relativeDay(new Date(nextLesson.date))}
                            </span>
                            <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 transition-colors" />
                        </div>

                        <h2 className="text-lg font-bold text-white mb-3 group-hover:text-emerald-300 transition-colors">
                            {nextLesson.title}
                        </h2>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                            <span className="flex items-center gap-1.5">
                                <CalendarIcon className="w-3.5 h-3.5 text-emerald-500/70" />
                                {format(new Date(nextLesson.date), 'EEE, MMM d')}
                            </span>
                            {nextLesson.time && (
                                <span className="flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-emerald-500/70" />
                                    {nextLesson.time}
                                </span>
                            )}
                            {nextLesson.court && (
                                <span className="flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5 text-emerald-500/70" />
                                    {nextLesson.court}
                                </span>
                            )}
                        </div>

                        {/* Assigned drills preview */}
                        {assignedDrills.length > 0 && (
                            <div className="mt-5 pt-4 border-t border-emerald-500/10">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                                    Drill Preview
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                    {assignedDrills.map(drill => (
                                        <div
                                            key={drill.id}
                                            className="bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2.5 flex items-center gap-2.5"
                                        >
                                            <PlayCircle className="w-4 h-4 text-emerald-500/60 flex-shrink-0" />
                                            <div className="min-w-0">
                                                <p className="text-xs font-semibold text-slate-300 truncate">{drill.title}</p>
                                                <p className="text-[10px] text-slate-500">{drill.duration}m · {drill.category}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-slate-800/30 border border-slate-700/50 border-dashed rounded-2xl p-10 text-center">
                        <Sun className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                        <p className="text-sm text-slate-500">No lessons scheduled yet</p>
                        <p className="text-xs text-slate-600 mt-1">Your coach will add upcoming sessions</p>
                    </div>
                )}
            </motion.div>

            {/* ─── Stats Row ─── */}
            <motion.div variants={fadeUp} className="grid grid-cols-3 gap-3">
                <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4 text-center">
                    <Target className="w-5 h-5 text-emerald-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-white">{sessionsThisMonth}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Sessions</p>
                </div>
                <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4 text-center">
                    <Award className="w-5 h-5 text-amber-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-white">{matchesThisMonth}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Matches</p>
                </div>
                <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4 text-center">
                    <Flame className="w-5 h-5 text-orange-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-white">{streakCount}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Day Streak</p>
                </div>
            </motion.div>

            {/* ─── This Week ─── */}
            <motion.div variants={fadeUp}>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-medium text-slate-500 uppercase tracking-widest">This Week</h2>
                    <button
                        onClick={() => router.push('/calendar')}
                        className="text-xs text-emerald-500 hover:text-emerald-400 font-medium transition-colors"
                    >
                        View Calendar →
                    </button>
                </div>

                {weekEvents.length > 0 ? (
                    <div className="space-y-1">
                        {weekEvents.map((event, idx) => (
                            <div
                                key={event.id}
                                className="flex items-center gap-4 py-3 px-3 rounded-xl hover:bg-slate-800/40 transition-colors cursor-default group"
                            >
                                {/* Date chip */}
                                <div className="w-11 text-center flex-shrink-0">
                                    <span className="block text-[10px] font-bold text-slate-600 uppercase">
                                        {format(new Date(event.date), 'EEE')}
                                    </span>
                                    <span className={cn(
                                        "block text-lg font-bold leading-none mt-0.5",
                                        isToday(new Date(event.date)) ? "text-emerald-400" : "text-white"
                                    )}>
                                        {format(new Date(event.date), 'd')}
                                    </span>
                                </div>

                                <div className="w-px h-8 bg-slate-800" />

                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-200 truncate group-hover:text-white transition-colors">
                                        {event.title}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {event.time || 'All day'} · {event.type}
                                    </p>
                                </div>

                                <div className={cn(
                                    "w-2 h-2 rounded-full flex-shrink-0",
                                    event.type === 'session' && "bg-emerald-500",
                                    event.type === 'match' && "bg-amber-500",
                                    event.type === 'event' && "bg-blue-500",
                                    event.type === 'match-prep' && "bg-purple-500",
                                    !['session', 'match', 'event', 'match-prep'].includes(event.type) && "bg-slate-600"
                                )} />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-8 text-center text-sm text-slate-600">
                        Nothing scheduled this week
                    </div>
                )}
            </motion.div>

            {/* ─── Coach Feedback ─── */}
            <motion.div variants={fadeUp}>
                <h2 className="text-sm font-medium text-slate-500 uppercase tracking-widest mb-3">
                    Coach Feedback
                </h2>
                {coachNotes.length > 0 ? (
                    <div className="space-y-3">
                        {coachNotes.slice(0, 5).map(note => (
                            <div key={note.id} className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className={cn(
                                        "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full",
                                        note.type === 'technical' && "bg-blue-500/10 text-blue-400",
                                        note.type === 'mental' && "bg-purple-500/10 text-purple-400",
                                        note.type === 'tactical' && "bg-amber-500/10 text-amber-400"
                                    )}>
                                        {note.type}
                                    </span>
                                    {note.subType && (
                                        <span className="text-[10px] text-slate-500">{note.subType}</span>
                                    )}
                                    <span className="text-[10px] text-slate-600 ml-auto">
                                        {format(new Date(note.updatedAt), 'MMM d')}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-300 leading-relaxed">{note.content}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-slate-800/30 border border-slate-700/40 border-dashed rounded-xl p-8 text-center">
                        <MessageSquare className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                        <p className="text-xs text-slate-500">Notes and feedback from your coach will appear here</p>
                    </div>
                )}
            </motion.div>

            {/* Bottom spacer for mobile nav */}
            <div className="h-4" />

            {/* ─── Feedback Modal ─── */}
            {pendingFeedback && (
                <FeedbackOverlay 
                    session={pendingFeedback.session}
                    coachId={pendingFeedback.coachId}
                    onClose={() => setPendingFeedback(null)}
                />
            )}
        </motion.div>
    );
}
