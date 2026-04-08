'use client';

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useParams } from 'next/navigation';
import { dataStore, Session, Exercise, SessionExercise, CalendarEvent } from '@coach-pocket/core';
import { useDataStore } from '@/lib/useDataStore';
import { format } from 'date-fns';
import { ArrowLeft, Clock, Users, Target, Star, Printer, Play, Loader2, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import SessionExecutionView from '@/components/features/session/SessionExecutionView';
import AttendanceModal from '@/components/features/session/AttendanceModal';
import TeamSessionExecutionView from '@/components/features/session/TeamSessionExecutionView';
import { SessionSummaryView } from '@/components/features/session/SessionSummaryView';
import DrillAnimationModal from '@/components/features/library/DrillAnimationModal';
import TacticalBoard from '@/components/shared/TacticalBoard';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { SessionPDFTemplate } from '@coach-pocket/shared';
// The original Exercise import is now redundant as it's imported from '@/lib/store' above.
// import { Exercise } from '@coach-pocket/core'; // This line is implicitly removed by the new import

const CourtIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="4" y="2" width="16" height="20" rx="1" />
        <line x1="4" y1="12" x2="20" y2="12" strokeDasharray="2 2" />
        <line x1="7" y1="2" x2="7" y2="22" />
        <line x1="17" y1="2" x2="17" y2="22" />
        <line x1="7" y1="7" x2="17" y2="7" />
        <line x1="7" y1="17" x2="17" y2="17" />
        <line x1="12" y1="7" x2="12" y2="17" />
    </svg>
);

export default function SessionDetailPage() {
    const router = useRouter();
    const params = useParams();
    const sessionId = params.id as string;

    const [isExecuting, setIsExecuting] = useState(false);
    const [showAttendance, setShowAttendance] = useState(false);
    const [isTacticalBoardOpen, setIsTacticalBoardOpen] = useState(false);
    const [animatingDrill, setAnimatingDrill] = useState<Exercise | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
    };

    const exercisesSource = useDataStore(() => dataStore.getExercises());
    const session = useDataStore(() => dataStore.getSession(sessionId));
    const calendarEvents = useDataStore(() => dataStore.getCalendarEvents());

    const exercises = useMemo(() => {
        if (!session) return [];
        return session.exercises
            .map(se => {
                const exercise = exercisesSource.find(e => e.id === se.exerciseId);
                return exercise ? { ...se, exercise } : null;
            })
            .filter((e): e is NonNullable<typeof e> => e !== null);
    }, [session, exercisesSource]);

    const totalDuration = exercises.reduce((sum, ex) => sum + (ex.duration || 0), 0);

    const associatedEvent = calendarEvents.find(e => e.sessionId === sessionId);

    const pdfSessionData = useMemo(() => {
        if (!session) return null;
        
        // Ensure accurate date
        const dateStr = associatedEvent?.date || session.createdAt || new Date().toISOString();
        const formattedDate = new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        return {
            title: session.title || 'Untitled Session',
            date: formattedDate,
            playerName: session.teamId ? 'Team Session' : 'Individual Athlete',
            drills: exercises.map(ex => ({
                id: ex.id,
                name: ex.exercise?.title || 'Unknown Drill',
                duration: `${ex.duration || ex.exercise?.duration || 0} min`,
                description: ex.exercise?.description || ''
            }))
        };
    }, [session, associatedEvent, exercises, totalDuration]);

    useEffect(() => {
        if (session) {
            // Check if this session SHOULD be completed based on calendar
            const completedEvent = calendarEvents.find(e => e.sessionId === sessionId && e.completed);

            if (completedEvent && session.status !== 'completed') {
                // Auto-migrate legacy completed sessions
                console.log('Migrating session to completed status based on calendar event');
                const updates = { status: 'completed' as const, completedAt: new Date(completedEvent.date) };
                dataStore.updateSession(session.id, updates);
            }
        }
    }, [sessionId, session, calendarEvents]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('start') === 'true' && session) {
                // Auto-start session flow from notification
                if (session.type === 'team') {
                    setShowAttendance(true);
                } else {
                    setIsExecuting(true);
                }

                // Remove param from URL to prevent loop on refresh
                router.replace(`/session/${sessionId}`);
            }
        }
    }, [session, sessionId, router]);


    const handleStartSession = () => {
        console.log('SessionDetailPage: handleStartSession', session);
        if (session?.teamId) {
            setShowAttendance(true);
        } else {
            setIsExecuting(true);
        }
    };

    const handleAttendanceSave = async (attendance: { memberId: string; present: boolean }[]) => {
        console.log('SessionDetailPage: handleAttendanceSave', attendance);
        if (session) {
            setIsSaving(true);
            try {
                await dataStore.updateSession(session.id, { attendance });
                showToast("✓ Attendance saved to cloud");
            } catch (error) {
                console.error(error);
                alert("⚠️ Connection Issues. Sync failed, will try again.");
            } finally {
                setIsSaving(false);
            }
        }
        setShowAttendance(false);
        setIsExecuting(true);
    };

    const handleCompleteSession = async (results?: {
        notes: { [key: number]: string };
        ratings: { [key: number]: number };
        videoUrls: { [key: number]: string };
    }) => {
        if (!session) return;
        
        setIsSaving(true);
        try {
            let updatedExercises = session.exercises;

            if (results) {
                updatedExercises = session.exercises.map((se, index) => {
                    return {
                        ...se,
                        notes: results.notes[index] !== undefined ? results.notes[index] : se.notes,
                        rating: results.ratings[index] !== undefined ? results.ratings[index] : se.rating,
                        videoUrl: results.videoUrls[index] !== undefined ? results.videoUrls[index] : se.videoUrl,
                    };
                });
            }

            const updates = { 
                status: 'completed' as const, 
                completedAt: new Date(),
                exercises: updatedExercises
            };
            await dataStore.updateSession(session.id, updates);

            // Mark associated calendar event as completed
            const calEvent = calendarEvents.find(e => e.sessionId === sessionId);
            if (calEvent) {
                await dataStore.updateCalendarEvent(calEvent.id, { completed: true });
            }
            
            showToast("✅ Session saved to Cloud. Great job!");
            setIsExecuting(false);
        } catch (error) {
            console.error(error);
            alert("⚠️ Connection issues. Proceeding locally, please connect to internet later.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleTeamChange = async (newTeamId: string) => {
        if (session) {
            setIsSaving(true);
            try {
                await dataStore.updateSession(session.id, { teamId: newTeamId });
                showToast("✓ Team changed successfully");
            } catch (error) {
                console.error(error);
                alert("⚠️ Connection Issues. Team not updated on remote servers.");
            } finally {
                setIsSaving(false);
            }
        }
    };

    // const associatedEvent = calendarEvents.find(e => e.sessionId === sessionId); - moved up

    if (!session) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-white mb-4">Session Not Found</h2>
                    <p className="text-slate-400 mb-6">The session you&apos;re looking for doesn&apos;t exist.</p>
                    <button
                        onClick={() => router.back()}
                        className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                    >
                        Back to Calendar
                    </button>
                </div>
            </div>
        );
    }

    // If session is completed, show summary view
    if (session.status === 'completed') {
        return (
            <SessionSummaryView
                session={session}
                exercises={exercises}
                onClose={() => router.back()}
            />
        );
    }

    // const totalDuration = exercises.reduce((sum, ex) => sum + (ex.duration || 0), 0); - already moved up

    return (
        <div className="min-h-screen bg-slate-900">
            {/* Header */}
            <header className="bg-slate-800/50 border-b border-slate-700 sticky top-0 z-10 print:hidden">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button onClick={() => router.back()} className="p-2 hover:bg-slate-700 rounded-lg transition">
                                <ArrowLeft className="w-5 h-5 text-slate-400" />
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-white">{session.title}</h1>
                                <div className="flex items-center gap-4 mt-1">
                                    <span className="text-sm text-slate-400 capitalize">{session.type}</span>
                                    {totalDuration > 0 && (
                                        <>
                                            <span className="text-slate-600">•</span>
                                            <div className="flex items-center gap-1 text-sm text-slate-400">
                                                <Clock className="w-4 h-4" />
                                                {totalDuration} min total
                                            </div>
                                        </>
                                    )}
                                    <span className="text-slate-600">•</span>
                                    <div className="flex items-center gap-1 text-sm text-slate-400">
                                        <Target className="w-4 h-4" />
                                        {exercises.length} exercise{exercises.length !== 1 ? 's' : ''}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setIsTacticalBoardOpen(true)}
                                className="p-2.5 bg-slate-800 hover:bg-green-500 hover:text-slate-900 text-green-500 rounded-lg transition border border-slate-700 flex items-center justify-center"
                                title="Tactical Board"
                            >
                                <CourtIcon className="w-5 h-5" />
                            </button>

                            <button
                                onClick={handleStartSession}
                                className="flex items-center gap-2 px-6 py-2.5 bg-green-500 hover:bg-green-400 text-slate-900 font-bold rounded-full transition-all shadow-lg shadow-green-500/20 hover:shadow-green-500/40 active:scale-95"
                            >
                                <Play className="w-5 h-5 fill-current" />
                                Start Session
                            </button>

                            {pdfSessionData && (
                                <PDFDownloadLink
                                    document={<SessionPDFTemplate session={pdfSessionData} />}
                                    fileName={`${session.title.toLowerCase().replace(/\s+/g, '_')}_training_sheet.pdf`}
                                >
                                    {({ loading }) => (
                                        <button
                                            disabled={loading}
                                            className={cn(
                                                "p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition border border-slate-700",
                                                loading && "opacity-50"
                                            )}
                                            title="Print Session"
                                        >
                                            <Printer className="w-5 h-5" />
                                        </button>
                                    )}
                                </PDFDownloadLink>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Global Saving Spinner */}
            {isSaving && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md">
                    <div className="flex flex-col items-center gap-4 bg-slate-900 border border-slate-700 p-8 rounded-3xl shadow-2xl">
                        <div className="relative">
                            <div className="absolute inset-0 bg-green-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
                            <Loader2 className="w-12 h-12 text-green-500 animate-spin relative" />
                        </div>
                        <div className="text-center">
                            <p className="text-white font-bold text-lg">Syncing with Cloud...</p>
                            <p className="text-slate-400 text-sm mt-1">Please keep the app open.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Toast */}
            {toastMessage && (
                <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="bg-slate-800 border-l-4 border-green-500 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 w-max max-w-[90vw]">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span className="font-semibold text-sm md:text-base">{toastMessage}</span>
                    </div>
                </div>
            )}

            {/* Execute Views */}
            {showAttendance && session.teamId && (
                <AttendanceModal
                    teamId={session.teamId}
                    initialAttendance={session.attendance}
                    onSave={handleAttendanceSave}
                    onCancel={() => {
                        setShowAttendance(false);
                        setIsExecuting(true); // Skip attendance
                    }}
                    onUpdateTeam={handleTeamChange}
                />
            )}

            {isExecuting && session.type !== 'team' && (
                <SessionExecutionView
                    sessionId={session.id}
                    sessionTitle={session.title}
                    exercises={exercises}
                    onClose={() => setIsExecuting(false)}
                    onComplete={handleCompleteSession}
                />
            )}

            {isExecuting && session.type === 'team' && (
                <TeamSessionExecutionView
                    session={session}
                    exercises={exercises}
                    onClose={() => setIsExecuting(false)}
                    onComplete={handleCompleteSession}
                />
            )}

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-8 pb-32 print:p-0 print:max-w-none">
                {session.description && (
                    <div className="mb-8 bg-slate-800/50 border border-slate-700 rounded-xl p-6 print:hidden">
                        <h3 className="text-lg font-bold text-white mb-2">Description</h3>
                        <p className="text-slate-300">{session.description}</p>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Exercises */}
                    <div className="lg:col-span-2 space-y-6">
                        <h2 className="text-xl font-bold text-white print:hidden">Exercises</h2>

                        {exercises.length === 0 ? (
                            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
                                <Target className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                                <p className="text-slate-400 text-lg">No exercises in this session yet</p>
                            </div>
                        ) : (
                            exercises.map((item, index) => (
                                <div key={index} className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-green-500/50 transition">
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className={cn(
                                                    "text-xs font-bold px-2 py-1 rounded uppercase tracking-wider",
                                                    item.block === 'warm-up' && "bg-orange-500/20 text-orange-400",
                                                    item.block === 'technical' && "bg-blue-500/20 text-blue-400",
                                                    item.block === 'situational' && "bg-purple-500/20 text-purple-400",
                                                    item.block === 'competitive' && "bg-red-500/20 text-red-400",
                                                    item.block === 'cool-down' && "bg-teal-500/20 text-teal-400"
                                                )}>
                                                    {item.block.replace('-', ' ')}
                                                </span>
                                                {(item.duration || 0) > 0 && (
                                                    <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {item.duration}m
                                                    </span>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (item.exercise) {
                                                        setAnimatingDrill({
                                                            ...item.exercise,
                                                            duration: item.duration || item.exercise.duration
                                                        });
                                                    }
                                                }}
                                                className="text-lg font-bold text-white text-left hover:text-green-400 underline underline-offset-4 decoration-transparent hover:decoration-green-400 transition-colors focus:outline-none"
                                            >
                                                {item.exercise?.title}
                                            </button>
                                        </div>
                                        <div className="bg-slate-900 border border-slate-700 text-slate-400 text-xs font-bold px-2 py-1 rounded">
                                            #{index + 1}
                                        </div>
                                    </div>
                                    <p className="text-slate-400 text-sm mb-4">{item.exercise?.description}</p>
                                    <div className="flex flex-wrap gap-2">
                                        {item.exercise?.focusAreas.map(tag => (
                                            <span key={tag} className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Right Column: Details */}
                    <div className="space-y-6 print:hidden">
                        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                            <h3 className="text-lg font-bold text-white mb-4">Session Details</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-slate-500 uppercase font-bold">Type</label>
                                    <p className="text-slate-300 capitalize">{session.type}</p>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 uppercase font-bold">Total Duration</label>
                                    <p className="text-slate-300">{totalDuration} minutes</p>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 uppercase font-bold">Description</label>
                                    <p className="text-slate-300 text-sm mt-1">{session.description || 'No description provided.'}</p>
                                </div>
                            </div>
                        </div>

                        {associatedEvent && (
                            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                                <h3 className="text-lg font-bold text-white mb-4">Scheduled Event</h3>
                                <div className="flex items-center gap-3 text-slate-300">
                                    <div className="bg-slate-700 p-2 rounded-lg">
                                        <Clock className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="font-medium">{new Date(associatedEvent.date).toLocaleDateString()}</div>
                                        <div className="text-sm text-slate-500">{associatedEvent.time || 'All Day'}</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <DrillAnimationModal
                isOpen={!!animatingDrill}
                onClose={() => setAnimatingDrill(null)}
                drill={animatingDrill}
            />

            <TacticalBoard
                isOpen={isTacticalBoardOpen}
                onClose={() => setIsTacticalBoardOpen(false)}
            />
        </div>
    );
}
