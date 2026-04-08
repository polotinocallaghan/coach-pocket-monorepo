import React, { useState } from 'react';
import { Session, SessionExercise, Exercise, dataStore } from '@coach-pocket/core';
import { cn } from '@/lib/utils';
import { Star, CheckCircle, XCircle, ArrowLeft, Calendar, Users, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface SessionSummaryViewProps {
    session: Session;
    exercises: (SessionExercise & { exercise?: Exercise })[];
    onClose: () => void;
}

export function SessionSummaryView({ session, exercises, onClose }: SessionSummaryViewProps) {
    const [rating, setRating] = useState(session.rating || 0);
    const [feedback, setFeedback] = useState(session.feedback || '');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = () => {
        setIsSaving(true);
        // Simulate API call
        setTimeout(() => {
            dataStore.updateSession(session.id, {
                rating,
                feedback
            });
            setIsSaving(false);
            onClose();
        }, 500);
    };

    const completedCount = session.completedExerciseIds?.length || 0;
    const totalCount = exercises.length;
    const progress = Math.round((completedCount / totalCount) * 100) || 0;

    const presentMembers = session.attendance?.filter(a => a.present) || [];

    return (
        <div className="bg-slate-900 min-h-screen pb-20">
            {/* Header */}
            <div className="bg-slate-800 border-b border-slate-700 sticky top-0 z-10">
                <div className="px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-700 rounded-lg transition text-slate-400 hover:text-white"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-white flex items-center gap-2">
                                Session Summary
                                <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded-full border border-green-500/30">
                                    Completed
                                </span>
                            </h1>
                            <p className="text-slate-400 text-sm">
                                {format(session.createdAt, 'MMMM d, yyyy')} • {session.title}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition flex items-center gap-2"
                    >
                        {isSaving ? 'Saving...' : 'Save Review'}
                    </button>
                </div>
            </div>

            <div className="max-w-3xl mx-auto p-4 space-y-6">

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                        <div className="text-slate-400 text-xs mb-1 uppercase tracking-wider">Completion</div>
                        <div className="text-2xl font-bold text-green-400">{progress}%</div>
                        <div className="text-slate-500 text-xs">{completedCount}/{totalCount} drills</div>
                    </div>
                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                        <div className="text-slate-400 text-xs mb-1 uppercase tracking-wider">Duration</div>
                        <div className="text-2xl font-bold text-blue-400">
                            {exercises.reduce((acc, ex) => acc + (ex.duration || 0), 0)}m
                        </div>
                        <div className="text-slate-500 text-xs">Total planned time</div>
                    </div>
                    {session.teamId && (
                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                            <div className="text-slate-400 text-xs mb-1 uppercase tracking-wider">Attendance</div>
                            <div className="text-2xl font-bold text-purple-400">
                                {presentMembers.length}
                            </div>
                            <div className="text-slate-500 text-xs">Players present</div>
                        </div>
                    )}
                </div>

                {/* Rating & Feedback */}
                <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                    <div className="p-4 border-b border-slate-700 bg-slate-800/50">
                        <h2 className="font-semibold text-white flex items-center gap-2">
                            <Star className="w-4 h-4 text-yellow-400" />
                            How did it go?
                        </h2>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="flex justify-center gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    onClick={() => setRating(star)}
                                    className="p-2 transition hover:scale-110"
                                >
                                    <Star
                                        className={cn(
                                            "w-10 h-10 transition-colors",
                                            rating >= star ? "fill-yellow-400 text-yellow-400" : "text-slate-600"
                                        )}
                                    />
                                </button>
                            ))}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">
                                Session Notes & Reflection
                            </label>
                            <textarea
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                placeholder="What went well? What needs improvement? Any player notes?"
                                className="w-full h-32 bg-slate-900 border border-slate-700 rounded-lg p-3 text-white placeholder-slate-500 focus:outline-none focus:border-green-500 transition resize-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Exercise Summary List */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Exercise Log</h3>
                    <div className="space-y-2">
                        {exercises.map((item, index) => {
                            const isCompleted = session.completedExerciseIds?.includes(item.id);
                            return (
                                <div
                                    key={item.id}
                                    className={cn(
                                        "flex items-center gap-4 p-4 rounded-xl border transition",
                                        isCompleted
                                            ? "bg-slate-800/50 border-slate-700"
                                            : "bg-slate-800/30 border-slate-700/50 opacity-60"
                                    )}
                                >
                                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 font-medium text-sm">
                                        {index + 1}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-medium text-white">{item.exercise?.title || 'Unknown Exercise'}</div>
                                        <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> {item.duration}m
                                            </span>
                                            {item.block && (
                                                <span className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 capitalize">
                                                    {item.block}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        {isCompleted ? (
                                            <div className="flex items-center gap-1.5 text-green-400 text-sm font-medium">
                                                <CheckCircle className="w-5 h-5" />
                                                <span className="hidden sm:inline">Done</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 text-slate-500 text-sm">
                                                <XCircle className="w-5 h-5" />
                                                <span className="hidden sm:inline">Skipped</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

            </div>
        </div>
    );
}
