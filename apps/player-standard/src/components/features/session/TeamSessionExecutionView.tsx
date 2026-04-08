import React, { useState, useEffect } from 'react';
import { Session, SessionExercise, Exercise, dataStore } from '@coach-pocket/core';
import { cn } from '@/lib/utils';
import { Check, Clock, X, ChevronRight, Users, Play, Pause, RotateCcw } from 'lucide-react';
import AttendanceSidebar from './AttendanceSidebar';
import TacticalBoard from '../../shared/TacticalBoard';

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

interface TeamSessionExecutionViewProps {
    session: Session;
    exercises: (SessionExercise & { exercise?: Exercise })[];
    onClose: () => void;
    onComplete: () => void;
}

export default function TeamSessionExecutionView({ session, exercises, onClose, onComplete }: TeamSessionExecutionViewProps) {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [elapsedTime, setElapsedTime] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(true);
    const [isTacticalBoardOpen, setIsTacticalBoardOpen] = useState(false);

    // Group exercises by timeSlot
    // Structure: { [timeSlot]: { [courtId]: SessionExercise[] } }
    const [grid, setGrid] = useState<Record<string, Record<string, (SessionExercise & { exercise?: Exercise })[]>>>({});
    const [timeSlots, setTimeSlots] = useState<string[]>([]);
    const [courtIds, setCourtIds] = useState<string[]>([]);
    const [completedExerciseIds, setCompletedExerciseIds] = useState<Set<string>>(new Set(session.completedExerciseIds || []));

    // Initialize Grid
    useEffect(() => {
        const newGrid: Record<string, Record<string, any[]>> = {};
        const slots = new Set<string>();
        const courts = new Set<string>();

        exercises.forEach(ex => {
            if (ex.timeSlot) slots.add(ex.timeSlot);
            if (ex.courtId) courts.add(ex.courtId);

            const time = ex.timeSlot || 'Unscheduled';
            const court = ex.courtId || 'Unassigned';

            if (!newGrid[time]) newGrid[time] = {};
            if (!newGrid[time][court]) newGrid[time][court] = [];

            newGrid[time][court].push(ex);
        });

        // Sort time slots
        const sortedSlots = Array.from(slots).sort();
        setTimeSlots(sortedSlots.length > 0 ? sortedSlots : ['Unscheduled']);

        // Sort courts (court-1, court-2...)
        const sortedCourts = Array.from(courts).sort();
        setCourtIds(sortedCourts.length > 0 ? sortedCourts : ['Unassigned']);

        setGrid(newGrid);
    }, [exercises]);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
            if (isTimerRunning) {
                setElapsedTime(prev => prev + 1);
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [isTimerRunning]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const toggleExerciseCompletion = (exerciseId: string) => {
        const newSet = new Set(completedExerciseIds);
        if (newSet.has(exerciseId)) {
            newSet.delete(exerciseId);
        } else {
            newSet.add(exerciseId);
        }
        setCompletedExerciseIds(newSet);
        dataStore.updateSession(session.id, { completedExerciseIds: Array.from(newSet) });
    };

    const toggleBlockCompletion = (time: string, court: string) => {
        const blockExercises = grid[time]?.[court] || [];
        const allCompleted = blockExercises.every(ex => completedExerciseIds.has(ex.id));

        const newSet = new Set(completedExerciseIds);
        blockExercises.forEach(ex => {
            if (allCompleted) {
                newSet.delete(ex.id);
            } else {
                newSet.add(ex.id);
            }
        });
        setCompletedExerciseIds(newSet);
        dataStore.updateSession(session.id, { completedExerciseIds: Array.from(newSet) });
    };

    const handleAttendanceUpdate = (attendance: { memberId: string; present: boolean }[]) => {
        dataStore.updateSession(session.id, { attendance });
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col">
            {/* Header */}
            <div className="bg-slate-800 border-b border-slate-700 p-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full transition text-slate-400 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-white">{session.title} Execution</h1>
                        <div className="flex items-center gap-4 text-sm text-slate-400">
                            <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="bg-slate-700 px-2 py-0.5 rounded text-white font-mono">
                                {formatTime(elapsedTime)}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsTacticalBoardOpen(true)}
                        className="p-2 bg-slate-700 hover:bg-green-500 hover:text-slate-900 text-green-500 rounded-xl transition flex items-center gap-2 group mr-2"
                        title="Open Tactical Board"
                    >
                        <CourtIcon className="w-5 h-5" />
                        <span className="text-sm font-bold hidden sm:inline px-1">Tactical Board</span>
                    </button>

                    <button
                        onClick={() => setIsTimerRunning(!isTimerRunning)}
                        className="p-2 rounded-full bg-slate-700 hover:bg-slate-600 text-white transition"
                    >
                        {isTimerRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </button>
                    <button
                        onClick={onComplete}
                        className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg transition"
                    >
                        Complete Session
                    </button>
                </div>
            </div>

            {/* Main Layout */}
            <div className="flex flex-1 overflow-hidden">
                {/* Grid Content */}
                <div className="flex-1 overflow-auto p-6 bg-slate-900">
                    <div className="min-w-[800px]">
                        {/* Courts Header */}
                        <div className="grid grid-cols-[100px_1fr_1fr_1fr_1fr] gap-4 mb-4 sticky top-0 z-10 bg-slate-900 pb-2">
                            <div className="text-slate-500 font-bold uppercase text-xs pt-4 text-right pr-4">Time</div>
                            {courtIds.map(court => (
                                <div key={court} className="bg-slate-800 p-3 rounded-lg text-center font-bold text-white border border-slate-700">
                                    {court.replace('court-', 'Court ').toUpperCase()}
                                </div>
                            ))}
                        </div>

                        {/* Rows */}
                        <div className="space-y-4">
                            {timeSlots.map(time => (
                                <div key={time} className="grid grid-cols-[100px_1fr_1fr_1fr_1fr] gap-4">
                                    {/* Time Label */}
                                    <div className="text-right pr-4 pt-4">
                                        <div className="text-white font-bold">{time}</div>
                                        <div className="text-xs text-slate-500">30 min</div>
                                    </div>

                                    {/* Cells */}
                                    {courtIds.map(court => {
                                        const items = grid[time]?.[court] || [];
                                        const isBlockCompleted = items.length > 0 && items.every(ex => completedExerciseIds.has(ex.id));

                                        return (
                                            <div
                                                key={`${time}-${court}`}
                                                className={cn(
                                                    "bg-slate-800 border rounded-xl p-3 min-h-[120px] relative group transition-all",
                                                    isBlockCompleted ? "border-green-500/50 bg-green-500/5" : "border-slate-700",
                                                    items.length === 0 ? "opacity-50 border-dashed" : ""
                                                )}
                                            >
                                                {items.length > 0 && (
                                                    <button
                                                        onClick={() => toggleBlockCompletion(time, court)}
                                                        className={cn(
                                                            "absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-all z-10",
                                                            isBlockCompleted
                                                                ? "bg-green-500 text-slate-900 scale-100"
                                                                : "bg-slate-700 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-slate-600"
                                                        )}
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                )}

                                                <div className="space-y-2 mt-1">
                                                    {items.map(ex => {
                                                        const isCompleted = completedExerciseIds.has(ex.id);
                                                        return (
                                                            <div
                                                                key={ex.id}
                                                                onClick={() => toggleExerciseCompletion(ex.id)}
                                                                className={cn(
                                                                    "p-2 rounded-lg border text-sm cursor-pointer transition-all",
                                                                    isCompleted
                                                                        ? "bg-green-500/20 border-green-500/30 text-green-300 line-through opacity-70"
                                                                        : "bg-slate-700 border-slate-600 text-white hover:border-slate-500"
                                                                )}
                                                            >
                                                                <div className="font-semibold truncate">{ex.exercise?.title || 'Unknown Exercise'}</div>
                                                                <div className="flex items-center gap-2 text-xs opacity-70 mt-1">
                                                                    <span className={cn(
                                                                        "px-1.5 py-0.5 rounded capitalize",
                                                                        ex.block === 'warm-up' && "bg-orange-500/20 text-orange-400",
                                                                        ex.block === 'technical' && "bg-blue-500/20 text-blue-400",
                                                                        ex.block === 'situational' && "bg-purple-500/20 text-purple-400",
                                                                        ex.block === 'competitive' && "bg-red-500/20 text-red-400"
                                                                    )}>
                                                                        {ex.block}
                                                                    </span>
                                                                    {ex.exercise?.playerCount && <span>{ex.exercise.playerCount}p</span>}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                    {items.length === 0 && (
                                                        <div className="flex items-center justify-center h-full text-xs text-slate-600 italic">
                                                            Free Court
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Sidebar: Attendance */}
                {session.teamId && (
                    <AttendanceSidebar
                        teamId={session.teamId}
                        attendance={session.attendance}
                        onUpdate={handleAttendanceUpdate}
                    />
                )}
            </div>

            <TacticalBoard
                isOpen={isTacticalBoardOpen}
                onClose={() => setIsTacticalBoardOpen(false)}
            />
        </div>
    );
}
